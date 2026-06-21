import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    include: ['src/**/*.{test,spec}.{ts,tsx}', 'src/__tests__/**/*.{ts,tsx}'],
  },
});
