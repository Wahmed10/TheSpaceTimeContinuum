/** Independent checks collect evidence after a failure; prerequisites stay outside. */
export async function collectValidationStage(result, name, work, save) {
  try {
    await work();
    result[name] = { exitCode: 0 };
    save();
    return true;
  } catch (error) {
    result[name] = { exitCode: 1, error: error.message };
    result.failedMeasurements ??= [];
    if (!result.failedMeasurements.includes(name))
      result.failedMeasurements.push(name);
    save();
    return false;
  }
}
