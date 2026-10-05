/** Shared supported UTC range; the clock and date inputs use the same bounds. */
export const MIN_UTC_MS = Date.UTC(1900, 0, 1);
export const MAX_UTC_MS = Date.UTC(2101, 0, 1) - 1;
