/** Canonical object boundary guard for the standalone browser SDK. */
export const isPluginRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
