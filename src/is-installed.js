#!/usr/bin/env node
const getRoot = require('./get-root.js');
const path = require('path');
const shell = require('shelljs');

const inConfig = function(cwd) {
  const gitConfigPath = path.join(cwd, '.git', 'config');

  if (!shell.test('-f', gitConfigPath)) {
    return false;
  }

  const config = shell.cat(gitConfigPath);

  return (/npm-merge-driver-install/i).test(config);
};

const inAttr = function(cwd) {
  const gitAttrPath = path.join(cwd, '.git', 'info', 'attributes');

  if (!shell.test('-f', gitAttrPath)) {
    return false;
  }

  const attr = shell.cat(gitAttrPath);

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
