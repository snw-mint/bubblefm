import { defineConfig } from "vite";
import { resolve } from "path";
import fs from "fs";

export default defineConfig({
  plugins: [
    {
      name: "html-version-replacer",
      transformIndexHtml(html) {
        const packageJson = JSON.parse(
          fs.readFileSync(resolve(__dirname, "package.json"), "utf-8")
        );
        return html.replace(
          /class="versao">.*?<\/span>/g,
          `class="versao">v${packageJson.version}</span>`
        );
      },
    },
  ],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        result: resolve(__dirname, "result.html"),
        match: resolve(__dirname, "match/index.html"),
        matchResult: resolve(__dirname, "match/result.html"),
        privacy: resolve(__dirname, "privacy.html"),
        terms: resolve(__dirname, "terms.html"),
      },
    },
  },
  server: {
    proxy: {
      "/api/deezer": {
        target: "https://api.deezer.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/deezer/, ""),
      },
    },
  },
});
