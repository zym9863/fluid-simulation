// vite.config.js
export default {
  root: './',
  publicDir: 'public',
  server: {
    host: true,
    port: 3000
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
};