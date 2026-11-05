import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import type { Connect, Plugin } from "vite";

// The landing page is index.html at the root; the store and portal are demo/index.html under /demo.
// Page requests that aren't the root or a file load the app, the same as vercel.json, so deep
// links like /demo/admin work in dev and preview too.
const routeToApp: Connect.NextHandleFunction = (req, _res, next) => {
  const url = req.url ?? "/";
  const [pathname, query = ""] = url.split("?");
  const wantsPage = (req.headers.accept ?? "").includes("text/html");
  if (wantsPage && pathname !== "/" && pathname !== "/index.html" && !pathname.includes(".")) {
    req.url = "/demo/index.html" + (query ? `?${query}` : "");
  }
  next();
};

const demoRoutes = (): Plugin => ({
  name: "demo-routes",
  configureServer: server => { server.middlewares.use(routeToApp); },
  configurePreviewServer: server => { server.middlewares.use(routeToApp); },
});

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), demoRoutes()],
  build: {
    rolldownOptions: {
      input: {
        landing: path.resolve(import.meta.dirname, "index.html"),
        app: path.resolve(import.meta.dirname, "demo/index.html"),
      },
      output: {
        // Libraries both pages load up front get their own cacheable chunks instead of one oversized
        // one. Only eager libraries belong here: a group pulls everything it matches into one chunk,
        // so grouping a lazily loaded library (like supabase) would make it load up front.
        codeSplitting: {
          groups: [
            { name: "react", test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/, priority: 30 },
            { name: "router", test: /node_modules[\\/](react-router|react-router-dom)[\\/]/, priority: 25 },
            { name: "motion", test: /node_modules[\\/](framer-motion|motion-dom|motion-utils)[\\/]/, priority: 25 },
          ],
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
}));
