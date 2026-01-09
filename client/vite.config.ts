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
  build: {
    // This is a warning threshold only (not an error). Bump it so normal builds stay clean.
    chunkSizeWarningLimit: 900,
  },
  server: {
    port: 5173,
  },
});
