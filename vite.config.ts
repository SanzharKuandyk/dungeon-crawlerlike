import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vite";
export default defineConfig({
  plugins: [svelte()],
  build: { outDir: "dist/client" },
  server: {
    fs: {
      deny: [
        ".env",
        ".env.*",
        "*.{crt,pem}",
        "**/.git/**",
        "**/.Codex/**",
        "**/data/**",
        "**/content/**",
        "**/src/server/**",
      ],
    },
  },
});
