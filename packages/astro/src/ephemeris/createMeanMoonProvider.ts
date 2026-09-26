import { MOON_ELEMENTS } from '@space/domain';
import type { BodySpec, PositionProvider } from '@space/domain';

import { MeanElementsProvider } from './MeanElementsProvider';
import {
  DEG_TO_RAD,
  MIN_UTC_MS,
  MAX_UTC_MS,
  SEC_PER_DAY,
} from '../time/constants';
import { utcMsToTdb, jdToTdb } from '../time/scales';
export function createMeanMoonProvider(body: BodySpec): PositionProvider {
  const slug = body.id.split(':')[1]!;

  const row = MOON_ELEMENTS.moons.find((moon) => moon.id === body.id);
  if (!row) throw new Error(`No position provider for ${body.id}`);
  const yearSec = 365.25 * SEC_PER_DAY;
  const nodeRate =
    row.nodePeriodYears === 0
      ? 0
      : (2 * Math.PI) / (row.nodePeriodYears * yearSec);
  const periRate =
    row.apsisPeriodYears === 0
      ? 0
      : (2 * Math.PI) / (row.apsisPeriodYears * yearSec);
  // Approximate conversion from sidereal longitude rate to anomalistic rate.
  // Rounded mean elements do not support precision trajectory claims.
  const meanMotion =
    (2 * Math.PI) / (row.periodDays * SEC_PER_DAY) -
    periRate -
    Math.sign(Math.cos(row.inclinationDeg * DEG_TO_RAD)) * nodeRate;
  return new MeanElementsProvider(
    `jpl-mean:${slug}`,
    `ICRF_BODY:${row.parent}`,
    {
      epochTdbSec: jdToTdb(MOON_ELEMENTS.epochJdTdb),
      semiMajorAxisKm: row.semiMajorAxisKm,
      eccentricity: row.eccentricity,
      inclinationRad: row.inclinationDeg * DEG_TO_RAD,
      ascendingNodeRad: row.nodeDeg * DEG_TO_RAD,
      argumentOfPeriapsisRad: row.periapsisDeg * DEG_TO_RAD,
      meanAnomalyRad: row.meanAnomalyDeg * DEG_TO_RAD,
      meanMotionRadPerSec: meanMotion,
      nodeRateRadPerSec: nodeRate,
      periapsisRateRadPerSec: periRate,
      poleRaRad: row.poleRaDeg * DEG_TO_RAD,
      poleDecRad: row.poleDecDeg * DEG_TO_RAD,
    },
    { fromTdb: utcMsToTdb(MIN_UTC_MS), toTdb: utcMsToTdb(MAX_UTC_MS) },
  );
}
