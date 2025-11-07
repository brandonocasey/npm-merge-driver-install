#!/usr/bin/env node
const getRoot = require('./get-root.js');
const path = require('path');
const fs = require('fs');

const inConfig = function(cwd) {
  const gitConfigPath = path.join(cwd, '.git', 'config');

  if (!fs.existsSync(gitConfigPath)) {
    return false;
  }

  const config = fs.readFileSync(gitConfigPath, 'utf8');

  return (/npm-merge-driver-install/i).test(config);
};

const inAttr = function(cwd) {
  const gitAttrPath = path.join(cwd, '.git', 'info', 'attributes');

  if (!fs.existsSync(gitAttrPath)) {
    return false;
  }

  const attr = fs.readFileSync(gitAttrPath, 'utf8');

  return (/npm-merge-driver-install/i).test(attr);
};

const isInstalled = function(cwd, options) {
  const getRoot_ = options && options.getRoot || getRoot;
  const rootDir = getRoot_(cwd, options);

  if (!rootDir) {
    return false;
  }

  if (inConfig(rootDir) || inAttr(rootDir)) {
    return true;
  }

  return false;
};

module.exports = isInstalled;

// The code below will only run when working as an executable
// that way we can test the cli using require in unit tests.
if (require.main === module) {
  const exitCode = isInstalled() ? 0 : 1;

  process.exit(exitCode);
}
