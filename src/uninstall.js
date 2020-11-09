#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const spawnSync = require('child_process').spawnSync;
const rootDir = require('./get-root.js')();
const logger = require('./console.js');

if (!rootDir) {
  logger.log('Current working directory is not using git, skipping uninstall.');
  process.exit(0);
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
