import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpuValidationPlan } from './cpu-validation-plan.mjs';
import { collectValidationStage } from './validation-stage.mjs';

test('retains original one-pair report names by default', () => {
  assert.deepEqual(cpuValidationPlan(), [
    { index: 1, suffix: '', fileSuffix: '' },
  ]);
});

test('predeclares three unique report/log identities and rejects missing-work configurations', () => {
  const plan = cpuValidationPlan(3);
  assert.deepEqual(
    plan.map((p) => p.index),
    [1, 2, 3],
  );
  assert.equal(new Set(plan.map((p) => p.suffix)).size, 3);
  assert.equal(new Set(plan.map((p) => p.fileSuffix)).size, 3);
  for (const value of [0, -1, 4, 1.5, '3', null, NaN])
    assert.throws(() => cpuValidationPlan(value));
});

test('collects all fixed pairs after a failure and retains every failure', async () => {
  const result = {},
    visited = [];
  for (const pair of cpuValidationPlan(3))
    await collectValidationStage(
      result,
      'cpuRegression' + pair.suffix,
      async () => {
        visited.push(pair.index);
        if (pair.index !== 2) throw Error('original20percent rejected pair');
      },
      () => {},
    );
  assert.deepEqual(visited, [1, 2, 3]);
  assert.deepEqual(result.failedMeasurements, [
    'cpuRegression1',
    'cpuRegression3',
  ]);
  assert.equal(result.cpuRegression1.exitCode, 1);
  assert.equal(result.cpuRegression2.exitCode, 0);
  assert.equal(result.cpuRegression3.exitCode, 1);
});
