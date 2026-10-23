import { defineConfig } from 'vite';

export default defineConfig({
  // Relative assets make the build portable to subfolders (GitHub Pages, etc.).
  base: './',
  build: {
    // Three.js is a single large dependency; the warning is expected.
    chunkSizeWarningLimit: 800,
  },
});
