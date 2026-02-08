export const objectEntries = <T extends object, K extends keyof T>(object: T) =>
  Object.entries(object) as [keyof T, NonNullable<T[K]>][];

export const objectKeys = <T extends object, K extends keyof T>(object: T) =>
  Object.keys(object) as K[];
