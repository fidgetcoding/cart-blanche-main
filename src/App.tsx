import { lazy, Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";

// Storefront: eagerly loaded (customer-facing, must be instant)
import Index from "./pages/Index";

// Admin sub-pages: eagerly imported so tab switching is instant
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminDiscounts from './pages/admin/AdminDiscounts';
import AdminOrders from './pages/admin/AdminOrders';
import AdminInventory from './pages/admin/AdminInventory';
import AdminSettings from './pages/admin/AdminSettings';
import AdminPageEditor from './pages/admin/AdminPageEditor';
import AdminStylingGuide from './pages/admin/AdminStylingGuide';
import AdminSizeCharts from './pages/admin/AdminSizeCharts';
import LabIndex from './pages/admin/lab/LabIndex';

// Only lazy-load completely separate sections (different entry points)
const AuthPage = lazy(() => import('./pages/AuthPage'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const YzTemplate = lazy(() => import('./pages/admin/lab/YZTemplate'));
const SlTemplate = lazy(() => import('./pages/admin/lab/SlTemplate'));
const NotFound = lazy(() => import('./pages/NotFound'));

const queryClient = new QueryClient();

const router = createBrowserRouter([
  { path: "/", element: <Index /> },
  { path: "/auth", element: <Suspense fallback={null}><AuthPage /></Suspense> },
  { path: "/reset-password", element: <Suspense fallback={null}><ResetPassword /></Suspense> },
  { path: "/admin/lab/yz", element: <Suspense fallback={null}><YzTemplate /></Suspense> },
  { path: "/admin/lab/sl", element: <Suspense fallback={null}><SlTemplate /></Suspense> },
  {
    path: "/admin",
    element: <AdminLayout />,
    children: [
      { index: true, element: <AdminDashboard /> },
      { path: "discounts", element: <AdminDiscounts /> },
      { path: "grid", element: <AdminPageEditor /> },
      { path: "orders", element: <AdminOrders /> },
      { path: "inventory", element: <AdminInventory /> },
      { path: "styling-guide", element: <AdminStylingGuide /> },
      { path: "settings", element: <AdminSettings /> },
      { path: "lab", element: <LabIndex /> },
    ],
  },
  { path: "*", element: <Suspense fallback={null}><NotFound /></Suspense> },
]);

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
