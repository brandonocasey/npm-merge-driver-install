export default {
  test: {
    testTimeout: 60000,
    hookTimeout: 60000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './dist/coverage',
      exclude: ['node_modules/**', 'test/**', 'dist/**', '.config/**', '**/*.config.js'],
    },
  },
};
