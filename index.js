#!/usr/bin/env node

/* eslint-disable no-console */
const isCI = require('is-ci');
const path = require('path');
const fs = require('fs');
const spawnSync = require('child_process').spawnSync;
const execSync = require('child_process').execSync;
const npmMergeDriver = require.resolve('npm-merge-driver');

const findGitRoot = function(workingDir) {
  try {
    // Get the git root directory and strip any newlines
    return execSync('git rev-parse --show-toplevel', {cwd: workingDir}).toString().replace(/(\r\n|\n|\r)/gm, '');
  } catch (error) {
    // the above git command will throw an error if not inside a working tree
    // Most likely a localized version of the following string:
    // "fatal: not a git repository (or any of the parent directories): .git"
    console.log(error.message);
    process.exit(0);
  }
};

let rootDir;

if (process.env.INIT_CWD) {
  rootDir = findGitRoot(process.env.INIT_CWD);
} else {
  rootDir = findGitRoot(process.cwd());
}

console.log('npm-merge-driver-install');
console.log(rootDir);

if (!fs.existsSync(path.join(rootDir, '.git'))) {
  console.log('Current working directory does not contain a .git directory, skipping install');
  process.exit(0);
}

if (isCI && typeof process.env.NPM_MERGE_DRIVER_IGNORE_CI === 'undefined') {
  console.log('CI detected, skipping install');
  process.exit(0);
}

if (typeof process.env.NPM_MERGE_DRIVER_SKIP_INSTALL !== 'undefined') {
  console.log('env variable NPM_MERGE_DRIVER_SKIP_INSTALL is set skipping install');
  process.exit(0);
}

console.log('installing npm-merge-driver');

const result = spawnSync(npmMergeDriver, ['install'], {cwd: rootDir, stdio: 'inherit'});

process.exit(result.status);
