/**
 * Remove trailing slashes from URL
 */
export function trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/u, '');
}
