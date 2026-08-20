import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  root: "github-pages",
  base: "/",
  plugins: [react()],
  publicDir: "../public",
  build: {
    outDir: "../dist-vercel",
    emptyOutDir: true,
  },
});
