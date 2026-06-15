export default {
  test: {
    // The integration tests run real package-manager installs (npm, pnpm, yarn,
    // bun, deno), which are CPU heavy. The default `forks` pool cold-boots a worker
    // per file and, under that install load, the boot exceeds vitest's hardcoded 5s
    // WORKER_START_TIMEOUT, failing the run even when every test passes. The lighter
    // `threads` pool boots fast enough to survive the load. Tests pass an explicit
    // cwd to every spawned process (no process.chdir), so thread-shared process
    // state is safe here.
    pool: 'threads',
    // A real install under full machine load can run just past the default 60s, so
    // give the heavy integration tests headroom.
    testTimeout: 120000,
    hookTimeout: 120000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './dist/coverage',
      exclude: ['node_modules/**', 'test/**', 'dist/**', '.config/**', '**/*.config.js'],
    },
  },
};
