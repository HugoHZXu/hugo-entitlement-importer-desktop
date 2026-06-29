import { resolve } from 'node:path';

import tailwindcss from '@tailwindcss/vite';
import vue from '@vitejs/plugin-vue';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';

const rendererRoot = resolve(__dirname, 'src/renderer/src');

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
  },
  renderer: {
    resolve: {
      alias: [
        {
          find: '@',
          replacement: rendererRoot,
        },
      ],
    },
    plugins: [tailwindcss(), vue()],
  },
});
