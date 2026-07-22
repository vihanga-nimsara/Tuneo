import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  publicDir: "public",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, "src/popup/index.html"),
        sidepanel: resolve(__dirname, "src/sidepanel/index.html"),
        offscreen: resolve(__dirname, "src/offscreen/index.html"),
        background: resolve(__dirname, "src/background.ts")
      },
      output: {
        entryFileNames: (chunk) => {
          // background & offscreen must keep predictable top-level names
          if (chunk.name === "background") return "background.js";
          return "assets/[name]-[hash].js";
        }
      }
    }
  }
});
