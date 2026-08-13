// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  vite: {
    server: {
      port: 8080,
      host: true,
      allowedHosts: true,
    },
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  plugins: [
    VitePWA({
      // TanStack Start has no static index.html to inject a <script> into —
      // registration is done manually, production-only, by
      // src/components/pwa/PwaUpdatePrompt.tsx via the virtual:pwa-register
      // module. vite-plugin-pwa itself is SSR-aware and only runs during the
      // client build pass (it no-ops when config.build.ssr is true), so it
      // never touches Nitro's server bundle.
      injectRegister: null,
      registerType: "prompt",
      manifestFilename: "manifest.webmanifest",
      // Nitro relocates the client build into .output/public (confirmed by
      // inspecting the build output); vite-plugin-pwa's own outDir
      // detection defaults to Vite's raw build.outDir ("dist") in this
      // Nitro-wrapped setup and would otherwise write sw.js into a stray
      // top-level dist/ folder that never ships. Point it at the real
      // deployed directory explicitly.
      outDir: ".output/public",
      manifest: {
        name: "SAOVIA",
        short_name: "SAOVIA",
        description: "La plateforme ERP intelligente pour piloter votre entreprise.",
        lang: "fr",
        start_url: "/",
        display: "standalone",
        background_color: "#0B1F4D",
        theme_color: "#0B1F4D",
        icons: [
          { src: "/pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png" },
        ],
      },
      workbox: {
        // Precache ONLY the client build's static app-shell assets (hashed
        // JS/CSS/icons/fonts under .output/public). Deliberately no
        // `navigateFallback` and no `runtimeCaching` entries: every page
        // navigation (server-rendered, tenant-specific) and every Supabase
        // request (auth/REST/storage/Edge Functions) therefore goes
        // straight to the network, exactly as today. This is load-bearing
        // for "never cache tenant/business data" — do not add a
        // runtimeCaching rule for the Supabase origin, and do not set
        // navigateFallback, without re-checking that requirement.
        //
        // generateSW's SPA default registers a NavigationRoute that serves
        // a cached "index.html" for every navigation — there is no such
        // file (this is an SSR app, every route is server-rendered and
        // tenant-specific), so that default must be turned off explicitly
        // or navigation while the SW is active would break entirely.
        navigateFallback: undefined,
        globPatterns: ["**/*.{js,css,ico,png,svg,webp,woff,woff2}"],
      },
    }),
  ],
});
