#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const spawnSync = require('child_process').spawnSync;
const getRoot = require('./get-root.js');
const logger = require('./console.js');

const uninstall = function(cwd) {
  const rootDir = getRoot(cwd);

  if (!rootDir) {
    logger.log('Current working directory is not using git, skipping uninstall.');
    return 0;
  }

  // remove git config settings
  spawnSync(
    'git',
    ['config', '--local', '--remove-section', 'merge.npm-merge-driver-install'],
    {cwd: rootDir}
  );

  spawnSync(
    'git',
    ['config', '--local', '--remove-section', 'merge.npm-merge-driver'],
    {cwd: rootDir}
  );

  const attrFile = path.join(rootDir, '.git', 'info', 'attributes');

  // remove git attributes
  if (fs.existsSync(attrFile)) {
    let attrContents = '';

    try {
      const RE = new RegExp('.* merge\\s*=\\s*npm-merge-driver-install$');
      const RE2 = new RegExp('.* merge\\s*=\\s*npm-merge-driver$');

      attrContents = fs
        .readFileSync(attrFile, 'utf8')
        .split(/\r?\n/)
        .filter(line => !line.match(RE) && !line.match(RE2))
        .join('\n');
    } catch (e) {
      // some issue we cannot handle
    }

    fs.writeFileSync(attrFile, attrContents);
  }

  logger.log('uninstalled successfully');

  return 0;
};

module.exports = uninstall;

// The code below will only run when working as an executable
// that way we can test the cli using require in unit tests.
if (require.main === module) {
  const exitCode = uninstall();

  process.exit(exitCode);
}
