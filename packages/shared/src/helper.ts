export const isDefined = <T>(value: T | undefined | null): value is Exclude<T, undefined | null> =>
  value !== undefined && value !== null;

export const objectEntries = <T extends object, K extends keyof T>(object: T) =>
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  Object.entries(object) as [keyof T, NonNullable<T[K]>][];

export const objectKeys = <T extends object, K extends keyof T>(object: T) =>
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  Object.keys(object) as K[];

export const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);
