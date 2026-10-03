import { expect, it } from 'vitest';
import { BODY_BY_ID, EXPLORABLE_BODIES } from '@space/domain';
import {
  certaintyLabel,
  entityType,
  formatDistance,
  formatPeriod,
  formatSpeed,
  formatUtc,
  methodLabel,
  positionDescription,
  provenanceDates,
} from '../src/lib/formatEntity';

for (const body of EXPLORABLE_BODIES) {
  it(`classifies ${body.id} and retains its actual certainty`, () => {
    const expected =
      body.kind === 'star'
        ? 'Star'
        : body.kind === 'moon'
          ? 'Moon'
          : body.kind === 'dwarf'
            ? 'Dwarf planet'
            : ['planet:jupiter', 'planet:saturn'].includes(body.id)
              ? 'Gas giant'
              : ['planet:uranus', 'planet:neptune'].includes(body.id)
                ? 'Ice giant'
                : 'Rocky planet';
    expect(entityType(body)).toBe(expected);
    expect(certaintyLabel(body.provenance.certainty)).toBe(
      body.provenance.certainty === 'approximate' ? 'Approximate' : 'Computed',
    );
    expect(provenanceDates(body.provenance)).toEqual([]);
  });
}
it('does not classify an unknown planet as rocky; uses explicit classification tags', () => {
  expect(entityType({ id: 'planet:new', kind: 'planet', tags: [] })).toBe(
    'Planet',
  );
  expect(
    entityType({ id: 'planet:new', kind: 'planet', tags: ['ice-giant'] }),
  ).toBe('Ice giant');
});
it('converts exact international miles and IAU astronomical units, including zero', () => {
  expect(formatDistance(1609.344, 'mi')).toBe('1,000 mi');
  expect(formatDistance(149597870.7, 'AU')).toBe('1 AU');
  expect(formatDistance(0, 'km')).toBe('0 km');
  expect(formatDistance(0, 'AU')).toBe('0 AU');
  expect(formatDistance(12742.0168, 'km')).toBe('12,742.02 km');
});
it('keeps small positive AU measurements distinct from physical zero', () => {
  expect(formatDistance(149.5978707, 'AU')).toBe('1.000e-6 AU');
  expect(formatDistance(0.0001, 'km')).toBe('1.000e-4 km');
  expect(formatDistance(2e6, 'km')).toBe('2 M km');
});
it('labels barycentric speed in mi/s or km/s independently of distance AU', () => {
  expect(formatSpeed(1.609344, 'mi')).toBe('1.00 mi/s');
  expect(formatSpeed(29.78, 'AU')).toBe('29.78 km/s');
  expect(formatSpeed(0, 'km')).toBe('0.00 km/s');
});
it('shows missing, negative and nonfinite measurements as unavailable', () => {
  for (const value of [undefined, null, NaN, Infinity, -1]) {
    expect(formatDistance(value, 'km')).toBe('Unavailable');
    expect(formatSpeed(value, 'mi')).toBe('Unavailable');
    expect(formatPeriod(value)).toBe('Unavailable');
  }
  expect(formatPeriod(0)).toBe('Unavailable');
});
it('preserves sub-day periods and does not invent an orbital period for the Sun', () => {
  expect(formatPeriod(BODY_BY_ID.get('moon:phobos')!.physical.periodDays)).toBe(
    '0.31891 Earth days',
  );
  expect(formatPeriod(BODY_BY_ID.get('star:sun')!.physical.periodDays)).toBe(
    'Unavailable',
  );
  expect(formatPeriod(365.256)).toBe('365.256 Earth days');
});
it('distinguishes JPL corrected, uncorrected analytic and approximate propagated models', () => {
  expect(positionDescription(BODY_BY_ID.get('planet:earth')!)).toContain(
    'JPL Horizons residual corrections',
  );
  expect(positionDescription(BODY_BY_ID.get('moon:callisto')!)).toContain(
    'residual corrections',
  );
  expect(positionDescription(BODY_BY_ID.get('moon:europa')!)).not.toContain(
    'corrections',
  );
  expect(positionDescription(BODY_BY_ID.get('moon:charon')!)).toContain(
    'two-body orbits',
  );
  expect(positionDescription(BODY_BY_ID.get('dwarf:ceres')!)).toContain(
    'not spacecraft telemetry',
  );
  expect(methodLabel('kepler-2body')).toBe('Two-body orbital propagation');
});
it('normalizes UTC offsets and separates source, ingestion and epoch dates from simulation time', () => {
  const provenance = {
    ...BODY_BY_ID.get('planet:earth')!.provenance,
    sourceTimestamp: '2026-09-20T08:00:00-04:00',
    ingestedAt: '2026-09-21T00:00:00Z',
    epoch: '2000-01-01T12:00:00Z',
  };
  const dates = provenanceDates(provenance);
  expect(dates.map((date) => [date.label, date.formatted])).toEqual([
    ['Source timestamp', '2026-09-20 12:00:00.000 UTC'],
    ['Ingested at', '2026-09-21 00:00:00.000 UTC'],
    ['Model epoch', '2000-01-01 12:00:00.000 UTC'],
  ]);
  for (const simulation of ['1900-01-02T12:00:00Z', '2099-12-30T12:00:00Z']) {
    expect(formatUtc(simulation)).toContain(simulation.slice(0, 10));
    expect(provenanceDates(provenance)).toEqual(dates);
  }
  expect(formatUtc('bad date')).toBe('Unavailable');
  expect(formatUtc(undefined)).toBe('Unavailable');
});
