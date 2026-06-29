import { resolve } from 'node:path';

import tailwindcss from '@tailwindcss/vite';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

const webRoot = resolve(__dirname, 'src');

export default defineConfig({
  base: './',
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
  },
  resolve: {
    alias: [
      {
        find: '@',
        replacement: webRoot,
      },
    ],
  },
  plugins: [tailwindcss(), vue()],
});
