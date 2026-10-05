/** Extra fixed repetitions strengthen the original gate; never select a pass. */
export function cpuValidationPlan(value = 1) {
  if (!Number.isInteger(value) || value < 1 || value > 3)
    throw new Error('CPU validation requires one to three fixed repetitions');
  return Array.from({ length: value }, (_, index) => ({
    index: index + 1,
    suffix: value === 1 ? '' : String(index + 1),
    fileSuffix: value === 1 ? '' : '-' + (index + 1),
  }));
}
