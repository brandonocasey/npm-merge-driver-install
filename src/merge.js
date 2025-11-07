#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { log } from './logger.js';

const currentVersion = process.argv[2];
const ancestorVersion = process.argv[3];
const otherVersion = process.argv[4];
const file = process.argv[5];

log(`attempting to merge ${file} via npm i --package-lock-only`);

// Convert relative path to absolute path
const absoluteFilePath = path.resolve(file);
const fileDir = path.dirname(absoluteFilePath);

const ret = spawnSync('git', ['merge-file', '-p', currentVersion, ancestorVersion, otherVersion], {
  stdio: [0, 'pipe', 2],
});

fs.writeFileSync(absoluteFilePath, ret.stdout);

const npmArgs = ['install', '--package-lock-only', '--prefer-offline', '--no-audit', '--progress=false'];

const spawnOptions = {
  cwd: fileDir,
  stdio: ['pipe', 'pipe', 'pipe'],
};

let install;

// Windows needs shell: true to run .cmd files
// Use string form to avoid DEP0190 deprecation warning
if (os.platform() === 'win32') {
  const command = `npm.cmd ${npmArgs.join(' ')}`;

  install = spawnSync(command, { ...spawnOptions, shell: true });
} else {
  install = spawnSync('npm', npmArgs, spawnOptions);
}

if (install.status !== 0) {
  log(`${file} merge failure`);
  log('resolve package.json conflicts. Then run npm i --package-lock-only');
  if (install.stdout) {
    log('stdout:', install.stdout.toString());
  }
  if (install.stderr) {
    log('stderr:', install.stderr.toString());
  }
  console.log();
  process.exit(1);
}

fs.writeFileSync(currentVersion, fs.readFileSync(absoluteFilePath));
log(`${file} merged successfully`);
