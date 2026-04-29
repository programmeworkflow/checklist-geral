import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.png", "favicon.ico"],
      manifest: {
        name: "VISTEC — MedWork",
        short_name: "VISTEC",
        description:
          "Checklist de percepção de riscos ocupacionais — NR-01.",
        theme_color: "#0C97C4",
        background_color: "#f5f7fa",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        scope: "/",
        lang: "pt-BR",
        icons: [
          {
            src: "/favicon.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/favicon.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,png,jpg,svg,ico,woff2}"],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB pra abrigar o bundle principal
        // arquivos pequenos com hash → cache eterno
        // HTML → NetworkFirst (sempre busca novo, fallback ao cache offline)
        // Supabase REST GET → NetworkFirst com cache curto (offline-first leitura)
        // Storage uploads → CacheFirst (imagens/áudios)
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === "navigate",
            handler: "NetworkFirst",
            options: {
              cacheName: "html-cache",
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/,
            handler: "CacheFirst",
            options: {
              cacheName: "fonts",
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern:
              /^https:\/\/znbcxzbexjdexpsmjpli\.supabase\.co\/rest\/v1\/.*/,
            handler: "NetworkFirst",
            method: "GET",
            options: {
              cacheName: "supabase-rest",
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 7 },
              cacheableResponse: { statuses: [0, 200, 206] },
            },
          },
          {
            urlPattern:
              /^https:\/\/znbcxzbexjdexpsmjpli\.supabase\.co\/storage\/v1\/object\/public\/.*/,
            handler: "CacheFirst",
            options: {
              cacheName: "supabase-storage",
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Mutations (POST/PATCH/PUT/DELETE) — Background Sync
          {
            urlPattern:
              /^https:\/\/znbcxzbexjdexpsmjpli\.supabase\.co\/rest\/v1\/.*/,
            handler: "NetworkOnly",
            method: "POST",
            options: {
              backgroundSync: {
                name: "supabase-mutations-queue",
                options: { maxRetentionTime: 60 * 24 }, // 24h
              },
            },
          },
          {
            urlPattern:
              /^https:\/\/znbcxzbexjdexpsmjpli\.supabase\.co\/rest\/v1\/.*/,
            handler: "NetworkOnly",
            method: "PATCH",
            options: {
              backgroundSync: {
                name: "supabase-mutations-queue",
                options: { maxRetentionTime: 60 * 24 },
              },
            },
          },
          {
            urlPattern:
              /^https:\/\/znbcxzbexjdexpsmjpli\.supabase\.co\/rest\/v1\/.*/,
            handler: "NetworkOnly",
            method: "DELETE",
            options: {
              backgroundSync: {
                name: "supabase-mutations-queue",
                options: { maxRetentionTime: 60 * 24 },
              },
            },
          },
        ],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//, /^\/rest\//, /^\/storage\//],
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
      },
      devOptions: {
        enabled: false,
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "@tanstack/react-query",
      "@tanstack/query-core",
    ],
  },
}));
