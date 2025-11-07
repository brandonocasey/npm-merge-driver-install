// @ts-check

/**
 * @type {import('markdownlint-cli2').Configuration}
 */
const config = {
  config: {
    default: true,
    // Line length - don't enforce for code blocks and tables
    MD013: {
      line_length: 120,
      code_blocks: false,
      tables: false,
    },
    // Allow inline HTML
    MD033: false,
    // Allow duplicate headings
    MD024: false,
  },
  ignores: ['node_modules', 'CHANGELOG.md', 'coverage'],
};

export default config;
