// The real portal pages the Smart Portal chapter shows. They load on their own chunks so the
// landing's first paint doesn't wait on the dashboard charts; preloadPortalPages fetches them
// once the page is idle, well before a visitor scrolls that far.
export const portalPageImports = {
  dashboard: () => import('@/pages/admin/AdminDashboard'),
  orders: () => import('@/pages/admin/AdminOrders'),
  waitlist: () => import('@/pages/admin/AdminWaitlist'),
  subscribers: () => import('@/pages/admin/AdminSubscribers'),
  discounts: () => import('@/pages/admin/AdminDiscounts'),
  sizeCharts: () => import('@/pages/admin/AdminSizeCharts'),
};

export function preloadPortalPages(): void {
  for (const load of Object.values(portalPageImports)) void load();
}
