"""Offline reference rays; no engine code or NASA visualization coordinates used.

Requires numpy/spiceypy. Input cache: JPL phobos_2014_09_22.bds and PDS4
m2deimos.tab/xml from the links recorded in the surface registration audit.
Run: python tools/fixtures/audit-shape-registration.py .tools/surface-audit
"""
import hashlib
import json
import math
import pathlib
import sys

import numpy as np
import spiceypy as spice

cache = pathlib.Path(sys.argv[1])
dsk = cache / 'phobos_2014_09_22.bds'
table = cache / 'm2deimos.tab'
handle = spice.dasopr(str(dsk))
segment = spice.dlabfs(handle)
assert spice.frmnam(spice.dskgd(handle, segment).frmcde) == 'IAU_PHOBOS'
grid = np.loadtxt(table)
records = []
for body in ['phobos', 'deimos']:
    rays = []
    for latitude in [-60, -30, 0, 30, 60]:
        for east in range(0, 360, 30):
            lat, lon = math.radians(latitude), math.radians(east)
            direction = np.array([math.cos(lat) * math.cos(lon),
                                  math.cos(lat) * math.sin(lon), math.sin(lat)])
            if body == 'phobos':
                _, hit, found = spice.dskx02(handle, segment, direction * 100, -direction)
                assert found
                radius = float(np.linalg.norm(hit))
            else:
                # Thomas grid uses west longitude. Confirmed independently by
                # the companion Phobos grid against the explicit IAU_PHOBOS DSK.
                west = (360 - east) % 360
                match = grid[(grid[:, 0] == latitude) & (grid[:, 1] == west)]
                assert len(match) == 1
                radius = float(match[0, 2])
            rays.append({'latitude': latitude, 'east': east, 'radiusKm': round(radius, 8)})
    reference = dsk if body == 'phobos' else table
    records.append({'body': body, 'referenceFile': reference.name,
                    'referenceSha256': hashlib.sha256(reference.read_bytes()).hexdigest(),
                    'frame': 'IAU_PHOBOS' if body == 'phobos' else 'Thomas planetocentric, west-positive grid',
                    'rays': rays})
spice.dascls(handle)
output = pathlib.Path('packages/engine/test/fixtures/surface-shapes.json')
output.parent.mkdir(parents=True, exist_ok=True)
output.write_text(json.dumps({'records': records}, indent=2) + '\n', encoding='utf-8')
print(output)
