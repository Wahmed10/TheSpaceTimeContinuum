"""Offline only: pip install --target .tools/orientation/python spiceypy==6.0.0.
Run with PYTHONPATH=.tools/orientation/python from the repository root.
The kernel pool extracts active coefficients; pxform independently evaluates fixtures.
"""
import hashlib
import json
from pathlib import Path
import spiceypy as spice

kernel = Path('.tools/orientation/pck00011.tpc')
digest = '3dff7b1dbeceaa01f25467767d3fa25816051c85d162d1edf04acb310ee28bb1'
assert hashlib.sha256(kernel.read_bytes()).hexdigest() == digest
spice.kclear()
spice.furnsh(str(kernel))
assert int(spice.tkvrsn('TOOLKIT')[-4:]) >= 67

def pool(key):
    try:
        return spice.gdpool(key, 0, 1000).tolist()
    except spice.utils.exceptions.NotFoundError:
        return []

models = {}
records = []
for name, code in dict(phobos=401, deimos=402, io=501, europa=502,
                       ganymede=503, callisto=504, titan=606, triton=801,
                       charon=901, ceres=2000001).items():
    key = f'BODY{code}_'
    system = f'BODY{code // 100}_'
    degree = int((pool(system + 'MAX_PHASE_DEGREE') or [1])[0])
    raw_angles = pool(system + 'NUT_PREC_ANGLES')
    angles = [raw_angles[i:i+degree+1] for i in range(0, len(raw_angles), degree+1)]
    models[name] = dict(code=code, ra=pool(key+'POLE_RA'), dec=pool(key+'POLE_DEC'),
                        pm=pool(key+'PM'), raTerms=pool(key+'NUT_PREC_RA'),
                        decTerms=pool(key+'NUT_PREC_DEC'), pmTerms=pool(key+'NUT_PREC_PM'),
                        angles=angles)
    for et in [-3155760000, -86400, 0, 123456789, 631152000, 3155760000]:
        records.append(dict(body=name, tdbSec=et,
                            matrix=spice.pxform('IAU_'+name.upper(), 'J2000', et).flatten().tolist()))

meta = dict(source='https://naif.jpl.nasa.gov/pub/naif/generic_kernels/pck/pck00011.tpc',
            sha256=digest, toolkit=spice.tkvrsn('TOOLKIT'), spiceypy=spice.__version__)
for filename, value in [
    ('packages/astro/src/orientation/pck-models.json', dict(**meta, models=models)),
    ('packages/astro/test/fixtures/pck-orientations.json', dict(**meta, records=records)),
]:
    Path(filename).write_text(json.dumps(value, indent=2)+'\n', encoding='utf-8')
print(f'{len(models)} models, {len(records)} independent SPICE matrices; {meta["toolkit"]}')
