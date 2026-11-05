import { describe, expect, it } from 'vitest';
import { appLocation } from '../base-path';

describe('appLocation', () => {
  it('leaves app paths alone', () => {
    for (const path of ['/demo', '/demo/admin', '/demo/admin/inventory', '/demo/auth']) expect(appLocation(path)).toBe(path);
  });

  it('opens old links under /demo', () => {
    expect(appLocation('/')).toBe('/demo');
    expect(appLocation('/admin')).toBe('/demo/admin');
    expect(appLocation('/admin/orders')).toBe('/demo/admin/orders');
    expect(appLocation('/auth')).toBe('/demo/auth');
  });

  // These used to start with "/demo" as text, skip the move, and leave the router matching nothing: a blank page.
  it('moves paths that only start with the letters of /demo', () => {
    expect(appLocation('/demox')).toBe('/demo/demox');
    expect(appLocation('/demo.html')).toBe('/demo/demo.html');
    expect(appLocation('/demo-store/admin')).toBe('/demo/demo-store/admin');
  });

  // The nav and the chat match exact paths, so /demo/admin/ didn't light up the Dashboard tab.
  it('drops a trailing slash', () => {
    expect(appLocation('/demo/')).toBe('/demo');
    expect(appLocation('/demo/admin/')).toBe('/demo/admin');
    expect(appLocation('/admin/inventory//')).toBe('/demo/admin/inventory');
  });

  it('opens the app file itself as the store', () => {
    expect(appLocation('/demo/index.html')).toBe('/demo');
  });
});
