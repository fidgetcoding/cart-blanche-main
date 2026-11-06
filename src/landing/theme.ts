import type { ThemeSettings } from "@/contexts/ThemeContext";

// The landing is always the app's light mode. The store's tile hover glow is white at 8%, made for its dark page;
// on this light one it's the same glow in black.
export const LANDING_THEME: Partial<ThemeSettings> = { mode: "light", tileBgMode: "transparent", tileHoverGlow: "hsla(0,0%,0%,0.08)" };
