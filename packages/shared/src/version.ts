export interface VersionInfo {
  /** Current running app version (e.g. from package.json). */
  current: string;
  /** Latest version published on GitHub releases, or null if it could not be determined. */
  latest: string | null;
  updateAvailable: boolean;
}
