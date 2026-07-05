import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    proxy: {
      '/api/deezer': {
        target: 'https://api.deezer.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/deezer/, '')
      }
    }
  }
});
