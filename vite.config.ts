// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Static/SPA build target: the app is 100% client-side (all data comes from the
// FastAPI backend via fetch in src/api/mockClient.ts; no createServerFn and no
// server-only route loaders), so we emit a plain folder of static files that the
// backend serves. No SSR runtime, hence no custom server entry.
export default defineConfig({
  tanstackStart: {
    // SPA mode: prerender a single client-side shell to index.html and let
    // TanStack Router handle every route in the browser.
    spa: {
      enabled: true,
      prerender: {
        outputPath: "/index.html",
        crawlLinks: false,
      },
    },
  },
  // No Nitro deploy target: nothing server-side is emitted, so the build is
  // just the static client folder (dist/client) that the backend serves.
  nitro: false,
});
