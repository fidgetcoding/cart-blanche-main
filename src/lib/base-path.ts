/** The store and the portal live under /demo; the domain root is kept for the landing page. */
export const APP_BASENAME = '/demo';

/** A router path ("/admin") as the path in the address bar ("/demo/admin"). */
export function appPath(path: string): string {
  return APP_BASENAME + path;
}

/**
 * The path the address bar should show for a page the app was served for. Old links (/, /admin,
 * /auth) and stray paths move under /demo, where the router lives. A trailing slash is dropped, so
 * deep links match the nav's exact paths, and the app's own index.html opens as the store.
 */
export function appLocation(pathname: string): string {
  const inApp = pathname === APP_BASENAME || pathname.startsWith(APP_BASENAME + '/');
  const path = inApp ? pathname : APP_BASENAME + pathname;
  if (path === APP_BASENAME + '/index.html') return APP_BASENAME;
  return path.replace(/\/+$/, '') || '/';
}
