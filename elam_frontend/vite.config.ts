import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "ELAM Santé",
        short_name: "ELAM",
        description: "Le Waze de la Santé au Gabon",
        theme_color: "#059669",
        background_color: "#ffffff",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "pwa-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        navigateFallback: "/index.html",
        // l'API ne doit jamais être traitée comme une page statique
        navigateFallbackDenylist: [/^\/api/],
      },
    }),
  ],
  server: {
    port: 3000,
    host: true,
    proxy: {
      "/api": "http://localhost:5000",
    },
  },
});
