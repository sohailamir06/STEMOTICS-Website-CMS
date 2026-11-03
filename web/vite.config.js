import { defineConfig } from 'vite';
import { reactRouter } from '@react-router/dev/vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [tailwindcss(), reactRouter()],
  server: {
    port: 5173,
    strictPort: true,
    // Browser requests to /api (login, checkout, ...) go to the API in development.
    proxy: { '/api': 'http://localhost:4000' }
  }
});
