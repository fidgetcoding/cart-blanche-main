import { createRoot } from "react-dom/client";
import "../index.css";
import "./landing.css";
import { initAnalytics } from "./analytics";
import Landing from "./Landing";
import { preloadPortalPages } from "./page/lib/portal-pages";

void initAnalytics();
createRoot(document.getElementById("root")!).render(<Landing />);

// Fetch the portal pages once the landing has painted and gone idle.
window.addEventListener("load", () => {
  if ("requestIdleCallback" in window) window.requestIdleCallback(preloadPortalPages);
  else setTimeout(preloadPortalPages, 1500);
});
