import { useState } from "react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeProvider";
import { useTheme } from "@/contexts/ThemeContext";
import { CartProvider } from "@/contexts/CartProvider";
import { SmartCartProvider } from "@/contexts/SmartCartProvider";
import { StyleKitProvider } from "@/contexts/StyleKitProvider";
import Glide from "./page/Glide";
import { LANDING_THEME } from "./theme";

// The landing is always the app's light mode (SL defaults); the demo itself stays dark.
// The store pieces shown here are the real components, so they need the store's providers.
// The real portal pages need a router: the Dashboard calls useNavigate and Discounts guards unsaved
// changes with useBlocker, which only works in a data router. So the page gets a memory data router
// of its own that never leaves "/".
function Shell() {
  const { theme } = useTheme();
  return (
    <div className={`${theme} min-h-screen w-full bg-background text-foreground`}>
      <CartProvider>
        <SmartCartProvider>
          <StyleKitProvider>
            <Glide screen="hero" mode="light" thumb={false} />
          </StyleKitProvider>
        </SmartCartProvider>
      </CartProvider>
    </div>
  );
}

const page = (
  <ThemeProvider storageKey="cb-landing" defaults={LANDING_THEME}>
    <Shell />
  </ThemeProvider>
);

export default function Landing() {
  const [router] = useState(() => createMemoryRouter([{ path: "*", element: page }]));
  return <RouterProvider router={router} />;
}
