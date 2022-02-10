#!/usr/bin/env node
/* eslint-disable no-console */
const path = require('path');
const fs = require('fs');
const spawnSync = require('child_process').spawnSync;
const getRoot = require('./get-root.js');
const logger = require('./logger.js');
const uninstall = require('./uninstall.js');
const noop = require('./noop.js');

const install = function(cwd, options) {
  const logger_ = options && options.logger || logger;
  const env = options && options.env || process.env;
  const getRoot_ = options && options.getRoot || getRoot;
  const rootDir = getRoot_(cwd, options);

  if (!rootDir) {
    logger_.log('Current working directory is not using git or git is not installed, skipping install.');
    return 1;
  }

  uninstall(rootDir, {logger: {log: noop}});

  const mergePath = path.relative(rootDir, path.resolve(__dirname, 'merge.js'));
  const infoDir = path.join(rootDir, '.git', 'info');

  if (!fs.existsSync(infoDir)) {
    fs.mkdirSync(infoDir);
  }

  // add to git config
  const configOne = spawnSync(
    'git',
    ['config', '--local', 'merge.npm-merge-driver-install.name', 'automatically merge npm lockfiles'],
    {cwd: rootDir, env}
  );
  const configTwo = spawnSync(
    'git',
    ['config', '--local', 'merge.npm-merge-driver-install.driver', `node '${mergePath}' %A %O %B %P`],
    {cwd: rootDir, env}
  );

  if (configOne.status !== 0 || configTwo.status !== 0) {
    logger_.log('Failed to configure npm-merge-driver-install in git directory');
    return 1;
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

  logger_.log('installed successfully');

  return 0;
};

module.exports = install;

// The code below will only run when working as an executable
// that way we can test the cli using require in unit tests.
if (require.main === module) {
  const exitCode = install();

  process.exit(exitCode);
}

