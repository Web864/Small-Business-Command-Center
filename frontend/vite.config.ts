import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@appdeploy/client': fileURLToPath(new URL('./src/local-laravel-client.ts', import.meta.url)),
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': 'http://127.0.0.1:8000',
      '/local-login': 'http://127.0.0.1:8000',
      '/login': 'http://127.0.0.1:8000',
    },
  },
  build: {outDir:'dist'},
});
