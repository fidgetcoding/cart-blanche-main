/** The store and the portal live under /demo; the domain root is kept for the landing page. */
export const APP_BASENAME = '/demo';

/** A router path ("/admin") as the path in the address bar ("/demo/admin"). */
export function appPath(path: string): string {
  return APP_BASENAME + path;
}
