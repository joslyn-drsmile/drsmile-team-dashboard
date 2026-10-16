import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  root: "github-pages",
  base: "/",
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./github-pages/src/expo", import.meta.url)),
    },
  },
  publicDir: "../public",
  build: {
    outDir: "../dist-vercel",
    emptyOutDir: true,
  },
});
