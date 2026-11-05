import { lazy, Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeProvider";
import { APP_BASENAME } from "@/lib/base-path";

// Storefront: eagerly loaded (customer-facing, must be instant)
import Index from "./pages/Index";

// Merchant routes load on navigation, keeping charts and editors out of the shop entry.
// Route-level lazy loading also keeps the current screen visible during navigation.
const AuthPage = lazy(() => import('./pages/AuthPage'));
const YzTemplate = lazy(() => import('./pages/admin/lab/YZTemplate'));
const SlTemplate = lazy(() => import('./pages/admin/lab/SlTemplate'));
const NotFound = lazy(() => import('./pages/NotFound'));

const queryClient = new QueryClient();

// Old links (/, /admin, /auth) open the same page under /demo.
if (!window.location.pathname.startsWith(APP_BASENAME)) {
  const { pathname, search, hash } = window.location;
  window.history.replaceState(null, "", APP_BASENAME + (pathname === "/" ? "" : pathname) + search + hash);
}

const router = createBrowserRouter([
  { path: "/", element: <Index /> },
  { path: "/auth", element: <Suspense fallback={null}><AuthPage /></Suspense> },
  { path: "/admin/lab/yz", element: <Suspense fallback={null}><YzTemplate /></Suspense> },
  { path: "/admin/lab/sl", element: <Suspense fallback={null}><SlTemplate /></Suspense> },
  {
    path: "/admin",
    // Blank while the merchant chunk loads on a direct visit, as before.
    HydrateFallback: () => null,
    lazy: async () => ({ Component: (await import("./pages/admin/AdminLayout")).default }),
    children: [
      { index: true, lazy: async () => ({ Component: (await import("./pages/admin/AdminDashboard")).default }) },
      { path: "discounts", lazy: async () => ({ Component: (await import("./pages/admin/AdminDiscounts")).default }) },
      { path: "size-charts", lazy: async () => ({ Component: (await import("./pages/admin/AdminSizeCharts")).default }) },
      { path: "grid", lazy: async () => ({ Component: (await import("./pages/admin/AdminPageEditor")).default }) },
      { path: "orders", lazy: async () => ({ Component: (await import("./pages/admin/AdminOrders")).default }) },
      { path: "waitlist", lazy: async () => ({ Component: (await import("./pages/admin/AdminWaitlist")).default }) },
      { path: "subscribers", lazy: async () => ({ Component: (await import("./pages/admin/AdminSubscribers")).default }) },
      { path: "inventory", lazy: async () => ({ Component: (await import("./pages/admin/AdminInventory")).default }) },
      { path: "styling-guide", lazy: async () => ({ Component: (await import("./pages/admin/AdminStylingGuide")).default }) },
      { path: "settings", lazy: async () => ({ Component: (await import("./pages/admin/AdminSettings")).default }) },
      { path: "lab", lazy: async () => ({ Component: (await import("./pages/admin/lab/LabIndex")).default }) },
    ],
  },
  { path: "*", element: <Suspense fallback={null}><NotFound /></Suspense> },
], { basename: APP_BASENAME });

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <RouterProvider router={router} />
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
