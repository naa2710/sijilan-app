import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: projectRoot,
  base: "./",
  plugins: [react(), tailwindcss()],
  build: {
    chunkSizeWarningLimit: 1100,
    rollupOptions: {
      input: path.resolve(projectRoot, "index.html"),
    },
  },
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "lucide-react",
    ],
  },
  server: {
    host: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8787',
        changeOrigin: true,
      }
    },
    watch: {
      ignored: [
        "**/.gradle-home*/**",
        "**/android/**",
        "**/dist/**",
        "**/FINAL_APP_UPLOAD/**",
        "**/backup_v1/**",
        "**/*.zip",
        "**/*.apk",
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(projectRoot, "src"),
    },
  },
});
