import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // Tests share one in-memory MongoDB replica set per file; run files one at a time.
    fileParallelism: false,
    testTimeout: 30_000,
    // The first run downloads a MongoDB binary.
    hookTimeout: 300_000
  }
});
