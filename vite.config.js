import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // GitHub Project Pages: /NBKForrum/ | Cloudflare Pages root domain: /
  base: process.env.SITE_BASE || '/NBKForrum/',
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://127.0.0.1:8787',
    },
  },
});
