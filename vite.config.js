import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        gallery: resolve(import.meta.dirname, 'gallery/index.html'),
        collection: resolve(import.meta.dirname, 'my-collection/index.html'),
        marketplace: resolve(import.meta.dirname, 'marketplace/index.html')
      }
    }
  }
});
