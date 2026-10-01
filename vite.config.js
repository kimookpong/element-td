import { defineConfig } from 'vite';

export default defineConfig({
  // ใช้ path แบบ relative เพื่อให้ deploy ใต้ sub-path ได้ (เช่น GitHub Pages)
  base: './',
  build: { chunkSizeWarningLimit: 1200 },
});
