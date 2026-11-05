import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeProvider";
import { useTheme } from "@/contexts/ThemeContext";
import { CartProvider } from "@/contexts/CartProvider";
import { SmartCartProvider } from "@/contexts/SmartCartProvider";
import { StyleKitProvider } from "@/contexts/StyleKitProvider";
import Glide from "./page/Glide";

// The landing is always the app's light mode (SL defaults); the demo itself stays dark.
// The store pieces shown here are the real components, so they need the store's providers.
// The Dashboard calls useNavigate, so the page gets a router of its own that never leaves "/".
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

export default function Landing() {
  return (
    <MemoryRouter>
      <ThemeProvider storageKey="cb-landing" defaults={{ mode: "light", tileBgMode: "transparent" }}>
        <Shell />
      </ThemeProvider>
    </MemoryRouter>
  );
}
