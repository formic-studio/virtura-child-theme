import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    assetsDir: 'assets',
    emptyOutDir: true,
    manifest: true,
    outDir: 'dist',
    rollupOptions: {
      input: {
        adminVideoPoster: resolve(__dirname, 'src/scripts/admin-video-poster.js'),
        main: resolve(__dirname, 'src/scripts/main.js'),
      },
    },
  },
});
