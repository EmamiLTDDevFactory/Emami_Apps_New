import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/apps/rc-portal/',
  plugins: [react()],
  server: {
    port: 3000,
  },
});
