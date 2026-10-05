import { test } from 'node:test';
import assert from 'node:assert/strict';
import { collectValidationStage } from './validation-stage.mjs';

test('collects a failed independent check and still runs later checks without clearing failure', async () => {
  const result = {},
    saved = [];
  const save = () => saved.push(JSON.parse(JSON.stringify(result)));
  assert.equal(
    await collectValidationStage(
      result,
      'browserRegression',
      async () => {
        result.browser = { exitCode: 1, output: 'browser.json' };
        throw Error('browser assertion failed');
      },
      save,
    ),
    false,
  );
  assert.equal(
    await collectValidationStage(
      result,
      'cpuRegression',
      async () => {
        result.cpu = { exitCode: 0, output: 'cpu.json' };
      },
      save,
    ),
    true,
  );
  assert.deepEqual(result.failedMeasurements, ['browserRegression']);
  assert.equal(result.browser.exitCode, 1);
  assert.equal(result.cpu.exitCode, 0);
  assert.equal(saved.length, 2);
  assert.equal(saved[0].browserRegression.error, 'browser assertion failed');
});

test('retains all independent failures including a failed setup prerequisite within a group', async () => {
  const result = {},
    save = () => {};
  for (const name of ['profileRegression', 'cpuRegression'])
    await collectValidationStage(
      result,
      name,
      () => {
        throw Error(name + ' setup failed');
      },
      save,
    );
  assert.deepEqual(result.failedMeasurements, [
    'profileRegression',
    'cpuRegression',
  ]);
  assert.equal(result.profileRegression.exitCode, 1);
  assert.equal(result.cpuRegression.exitCode, 1);
});
