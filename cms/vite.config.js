import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// The CMS is served at /admin/ on the same domain as the site and API (Project-Folder-Structure §7).
export default defineConfig({
  base: '/admin/',
  plugins: [react(), tailwindcss()],
  server: {
    port: 5174,
    strictPort: true,
    proxy: { '/api': 'http://localhost:4000' }
  },
  preview: { port: 5174 }
});
