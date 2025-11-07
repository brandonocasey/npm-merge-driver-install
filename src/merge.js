#!/usr/bin/env node
/* eslint-disable no-console */
const spawnSync = require('child_process').spawnSync;
const path = require('path');
const fs = require('fs');
const logger = require('./logger');
const os = require('os');

const currentVersion = process.argv[2];
const ancestorVersion = process.argv[3];
const otherVersion = process.argv[4];
const file = process.argv[5];

logger.log(`attempting to merge ${file} via npm i --package-lock-only`);

// Convert relative path to absolute path
const absoluteFilePath = path.resolve(file);
const fileDir = path.dirname(absoluteFilePath);

const ret = spawnSync('git', ['merge-file', '-p', currentVersion, ancestorVersion, otherVersion], {stdio: [0, 'pipe', 2]});

fs.writeFileSync(absoluteFilePath, ret.stdout);

const npmCmd = os.platform() === 'win32' ? 'npm.cmd' : 'npm';
const npmArgs = ['install', '--package-lock-only', '--prefer-offline', '--no-audit', '--progress=false'];

const spawnOptions = {
  cwd: fileDir,
  stdio: ['pipe', 'pipe', 'pipe']
};

// Windows needs shell: true to run .cmd files
if (os.platform() === 'win32') {
  spawnOptions.shell = true;
}

const install = spawnSync(npmCmd, npmArgs, spawnOptions);

if (install.status !== 0) {
  logger.log(`${file} merge failure`);
  logger.log('resolve package.json conflicts. Then run npm i --package-lock-only');
  if (install.stdout) {
    logger.log('stdout:', install.stdout.toString());
  }
  if (install.stderr) {
    logger.log('stderr:', install.stderr.toString());
  }
  console.log();
  process.exit(1);
}

fs.writeFileSync(currentVersion, fs.readFileSync(absoluteFilePath));
logger.log(`${file} merged successfully`);
