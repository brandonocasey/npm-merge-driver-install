#!/usr/bin/env node
const getGitDir = require('./get-git-dir.js');
const path = require('path');
const fs = require('fs');

const inConfig = function(gitDir, options) {
  const gitConfigPath = path.join(gitDir, 'config');

  if (!fs.existsSync(gitConfigPath)) {
    return false;
  }

  const config = fs.readFileSync(gitConfigPath, 'utf8');

  return (/npm-merge-driver-install/i).test(config);
};

const inAttr = function(gitDir, options) {
  const gitAttrPath = path.join(gitDir, 'info', 'attributes');

  if (!fs.existsSync(gitAttrPath)) {
    return false;
  }

  const attr = fs.readFileSync(gitAttrPath, 'utf8');

  return (/npm-merge-driver-install/i).test(attr);
};

const isInstalled = function(cwd, options) {
  const getGitDir_ = options && options.getGitDir || getGitDir;
  const gitDir = getGitDir_(cwd, options);

  if (!gitDir) {
    return false;
  }

  if (inConfig(gitDir, options) || inAttr(gitDir, options)) {
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
