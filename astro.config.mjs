// @ts-check
import { defineConfig } from 'astro/config';
import path from "node:path";

import cloudflare from '@astrojs/cloudflare';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  adapter: cloudflare(),
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        "@src": path.resolve("./src"),
        "@components": path.resolve("./src/components"),
        "@layouts": path.resolve("./src/layouts"),
        "@pages": path.resolve("./src/pages"),
        "@styles": path.resolve("./src/styles"),
        "@sass": path.resolve("./src/sass"),
        "@data": path.resolve("./src/data"),
        "@controllers": path.resolve("./src/controllers"),
      },
    }
  }
});