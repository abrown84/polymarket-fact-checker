import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@convex": path.resolve(__dirname, "../convex"),
    },
  },
  server: {
    port: 5173,
    allowedHosts: true,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:3210",
        changeOrigin: true,
        ws: true,
      },
      "/sync": {
        target: "http://127.0.0.1:3210",
        changeOrigin: true,
        ws: true,
      },
      "/http": {
        target: "http://127.0.0.1:3210",
        changeOrigin: true,
        ws: true,
      },
    },
  },
});
