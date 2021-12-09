#!/usr/bin/env node
/* eslint-disable no-console */
const path = require('path');
const fs = require('fs');
const spawnSync = require('child_process').spawnSync;
const isCI = require('is-ci');
const rootDir = require('./get-root.js')();
const logger = require('./console');
const mergePath = path.relative(rootDir, path.resolve(__dirname, 'merge.js'));

if (!rootDir) {
  logger.log('Current working directory is not using git, skipping install.');
  process.exit(0);
}

if (isCI && typeof process.env.NPM_MERGE_DRIVER_IGNORE_CI === 'undefined') {
  logger.log('CI detected, skipping install.');
  process.exit(0);
}

if (typeof process.env.NPM_MERGE_DRIVER_SKIP_INSTALL !== 'undefined') {
  logger.log('env variable NPM_MERGE_DRIVER_SKIP_INSTALL is set, skipping install.');
  process.exit(0);
}

const infoDir = path.join(rootDir, '.git', 'info');

if (!fs.existsSync(infoDir)) {
  fs.mkdirSync(infoDir);
}

const uninstall = spawnSync('node', [path.join(__dirname, 'uninstall.js')], {cwd: rootDir});

// add to git config
const configOne = spawnSync(
  'git',
  ['config', '--local', 'merge.npm-merge-driver-install.name', 'automatically merge npm lockfiles'],
  {cwd: rootDir}
);
const configTwo = spawnSync(
  'git',
  ['config', '--local', 'merge.npm-merge-driver-install.driver', `node '${mergePath}' %A %O %B %P`],
  {cwd: rootDir}
);

if (uninstall.status !== 0 || configOne.status !== 0 || configTwo.status !== 0) {
  logger.log('Failed to configure npm-merge-driver-install in git directory');
  process.exit(0);
}

// add to attributes file
const attrFile = path.join(infoDir, 'attributes');
let attrContents = '';

if (fs.existsSync(attrFile)) {
  attrContents = fs.readFileSync(attrFile, 'utf8').trim();
}

if (attrContents && !attrContents.match(/[\n\r]$/g)) {
  attrContents = '\n';
}
attrContents += 'npm-shrinkwrap.json merge=npm-merge-driver-install\n';
attrContents += 'package-lock.json merge=npm-merge-driver-install\n';

fs.writeFileSync(attrFile, attrContents);
logger.log('installed successfully');
