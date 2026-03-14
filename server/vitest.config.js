import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/__tests__/**/*.test.js'],
    setupFiles: ['./src/__tests__/setup.js'],
    testTimeout: 10000,
  },
});
