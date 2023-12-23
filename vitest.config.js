import {defineConfig} from 'vitest/config'

import dts from 'vite-plugin-dts';
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
  },
  plugins: [dts()]
})