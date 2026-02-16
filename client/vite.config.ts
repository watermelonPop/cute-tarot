import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import svgr from 'vite-plugin-svgr'
import commonjs from '@rollup/plugin-commonjs';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    svgr(),
  ],
  server: {
    watch: {
      usePolling: true,
      interval: 100,
    },
    proxy: {
      '/api': 'http://localhost:3001'
    },
  },
  optimizeDeps: {
    include: ['html2pdf.js'], // pre-bundle this package
  },
  build: {
    rollupOptions: {
      plugins: [commonjs()],
    },
  },
})