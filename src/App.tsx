import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import Index from "./pages/Index";
import AuthPage from "./pages/AuthPage";
import ResetPassword from "./pages/ResetPassword";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminDiscounts from "./pages/admin/AdminDiscounts";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminInventory from "./pages/admin/AdminInventory";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminPlaceholder from "./pages/admin/AdminPlaceholder";
import AdminPageEditor from "./pages/admin/AdminPageEditor";
import AdminStylingGuide from "./pages/admin/AdminStylingGuide";
import LabIndex from "./pages/admin/lab/LabIndex";
import YzTemplate from "./pages/admin/lab/YZTemplate";
import SlTemplate from "./pages/admin/lab/SlTemplate";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/admin/lab/yz" element={<YzTemplate />} />
            <Route path="/admin/lab/sl" element={<SlTemplate />} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="discounts" element={<AdminDiscounts />} />
              <Route path="grid" element={<AdminPageEditor />} />
              
              <Route path="orders" element={<AdminOrders />} />
              <Route path="inventory" element={<AdminInventory />} />
              <Route path="styling-guide" element={<AdminStylingGuide />} />
              <Route path="settings" element={<AdminSettings />} />
              <Route path="lab" element={<LabIndex />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
