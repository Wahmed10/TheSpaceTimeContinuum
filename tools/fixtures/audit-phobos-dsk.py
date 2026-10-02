"""Compare source axes against the explicit JPL IAU_PHOBOS DSK.

Requires numpy/spiceypy; run with the cached reference directory as argument.
Every 16th source vertex supplies a deterministic direction; no engine imports.
"""
import hashlib
import itertools
import json
import pathlib
import struct
import sys

import numpy as np
import spiceypy as spice

cache = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else '.tools/surface-audit')
source = pathlib.Path('assets/source/phobos_vtad.glb').read_bytes()
end = 20 + struct.unpack_from('<I', source, 12)[0]
model = json.loads(source[20:end])
accessor = model['accessors'][model['meshes'][0]['primitives'][0]['attributes']['POSITION']]
view = model['bufferViews'][accessor['bufferView']]
positions = np.frombuffer(
    source, dtype='<f4', count=accessor['count'] * 3,
    offset=end + 8 + view.get('byteOffset', 0) + accessor.get('byteOffset', 0),
).reshape(-1, 3)[::16].astype(float)
reference = cache / 'phobos_2014_09_22.bds'
handle = spice.dasopr(str(reference))
segment = spice.dlabfs(handle)
assert spice.frmnam(spice.dskgd(handle, segment).frmcde) == 'IAU_PHOBOS'
results = []
try:
    for permutation in itertools.permutations(range(3)):
        for signs in itertools.product([-1, 1], repeat=3):
            rotation = np.eye(3)[list(permutation)] * np.array(signs)[:, None]
            if np.linalg.det(rotation) < 0:
                continue
            points = positions @ rotation.T
            radii = np.linalg.norm(points, axis=1)
            errors = []
            for direction, radius in zip(points / radii[:, None], radii):
                _, hit, found = spice.dskx02(handle, segment, direction * 100, -direction)
                assert found
                errors.append(radius - np.linalg.norm(hit))
            results.append({
                'sourceToIAU': rotation.astype(int).tolist(),
                'axes': [('+' if sign > 0 else '-') + 'XYZ'[axis]
                         for axis, sign in zip(permutation, signs)],
                'rmsKm': float(np.sqrt(np.mean(np.square(errors)))), 'rays': len(errors),
            })
finally:
    spice.dascls(handle)
results.sort(key=lambda result: result['rmsKm'])
print(json.dumps(results[:6], indent=2))
report = {
    'reference': str(reference),
    'referenceSha256': hashlib.sha256(reference.read_bytes()).hexdigest(),
    'sourceSha256': hashlib.sha256(source).hexdigest(),
    'sourceVertices': len(positions), 'candidates': results,
}
(cache / 'phobos-controlled-comparison.json').write_text(
    json.dumps(report, indent=2) + '\n', encoding='utf-8',
)
