// @ts-check
import { defineConfig } from 'astro/config';
import path from "node:path";

import cloudflare from '@astrojs/cloudflare';
import tailwindcss from '@tailwindcss/vite';

import sitemap, { ChangeFreqEnum } from "@astrojs/sitemap";

// https://astro.build/config
export default defineConfig({
  adapter: cloudflare(),
  site: "https://funding.sofidev.top/",
  output:'server',
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        "@src": path.resolve("./*"),
        "@components": path.resolve("./src/components"),
        "@layouts": path.resolve("./src/layouts"),
        "@pages": path.resolve("./src/pages"),
        "@styles": path.resolve("./src/styles"),
        "@infrastructure": path.resolve("./src/infrastructure"),
        "@types": path.resolve("./src/types"),
        "@controllers": path.resolve("./src/controllers"),
        "@image": path.resolve("./public/image")
      },
    },


  },

  integrations: [sitemap({
      filter: (page) =>
        !page.includes("/login"),
      serialize: (item) => {
        return {
          url: item.url,
          changefreq: ChangeFreqEnum.DAILY,
          priority: 0.8,
        };
      },
    }),]
});