import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { VitePWA } from "vite-plugin-pwa";

const port = Number(process.env.PORT || 5173);

const basePath = "/";

if (!basePath) {
  throw new Error(
    "BASE_PATH environment variable is required but was not provided.",
  );
}

// Ensure the path always ends with "/" for PWA manifest correctness
const manifestBase = basePath.endsWith("/") ? basePath : `${basePath}/`;

export default defineConfig(async ({ mode }) => {
  // Cloudflare Pages exposes dashboard variables to the build process via
  // process.env. Explicitly load the app's Vite env directory as well so the
  // behavior is the same whether the build runs from the workspace root or
  // from artifacts/paintflow-crm.
  const env = loadEnv(mode, path.resolve(import.meta.dirname), "VITE_");
  const supabaseUrl = process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL;
  const supabaseAnonKey =
    process.env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;

  if (mode === "production") {
    console.info(
      `[vite] VITE_SUPABASE_URL=${supabaseUrl || "<missing>"}`,
    );
    console.info(
      `[vite] VITE_SUPABASE_ANON_KEY=${supabaseAnonKey ? `<set:${supabaseAnonKey.length} chars>` : "<missing>"}`,
    );
  }

  return {
  define: {
    // Cloudflare Pages supplies these as process.env during the build. Vite
    // only exposes values from env files automatically, so explicitly bridge
    // dashboard variables into the client bundle.
    "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(supabaseUrl),
    "import.meta.env.VITE_SUPABASE_ANON_KEY": JSON.stringify(supabaseAnonKey),
  },
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      // Only activate the service worker in production builds
      devOptions: { enabled: false },
      workbox: {
        // Pre-cache all compiled assets
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2}"],
        // Offline fallback: serve index.html for all navigation requests
        navigateFallback: "index.html",
        // Don't intercept API calls with the SW
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          // Google Fonts stylesheet — revalidate in background
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "google-fonts-stylesheets",
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          // Google Fonts files — long-lived, cache-first
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-webfonts",
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          // Supabase / API calls — always go to network, no caching
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: "NetworkOnly",
          },
          // Same-origin images and icons — stale-while-revalidate
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "images",
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
      manifest: {
        name: "GOYAL TRADERS CRM",
        short_name: "GOYAL CRM",
        description:
          "Paints, Sanitary & Plumbing Store CRM — Manage customers, billing, inventory and reports.",
        theme_color: "#1d4ed8",       // Professional Blue (Tailwind blue-700)
        background_color: "#ffffff",  // White
        display: "standalone",
        orientation: "portrait-primary",
        // Use the actual deploy base path so scope + start_url always match
        scope: manifestBase,
        start_url: manifestBase,
        categories: ["business", "productivity"],
        icons: [
          {
            src: `${manifestBase}pwa-192x192.png`,
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: `${manifestBase}pwa-512x512.png`,
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: `${manifestBase}pwa-512x512-maskable.png`,
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
    }),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, "../.."),
            }),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom"],
          "router": ["react-router-dom"],
          "query": ["@tanstack/react-query"],
          "supabase": ["@supabase/supabase-js"],
          "ui-radix": [
            "@radix-ui/react-dialog",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-select",
            "@radix-ui/react-tabs",
            "@radix-ui/react-tooltip",
            "@radix-ui/react-popover",
            "@radix-ui/react-accordion",
          ],
          "charts": ["recharts"],
          "motion": ["framer-motion"],
        },
      },
    },
  },
  server: {
    port,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
  };
});
