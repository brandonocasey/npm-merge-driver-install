#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import getGitDir from './get-git-dir.js';
import { log } from './logger.js';
import noop from './noop.js';
import uninstall from './uninstall.js';

const install = (cwd, options) => {
  const logger = options?.logger || { log };
  const env = options?.env || process.env;
  const getGitDir_ = options?.getGitDir || getGitDir;
  const gitDir = getGitDir_(cwd, options);

  if (!gitDir) {
    logger.log('Current working directory is not using git or git is not installed, skipping install.');
    return 1;
  }

  uninstall(cwd, { logger: { log: noop } });

  const mergePath = fileURLToPath(new URL('./merge.js', import.meta.url));
  const infoDir = path.join(gitDir, 'info');

  if (!fs.existsSync(infoDir)) {
    fs.mkdirSync(infoDir);
  }

  // add to git config
  const configOne = spawnSync(
    'git',
    ['config', '--local', 'merge.npm-merge-driver-install.name', 'automatically merge npm lockfiles'],
    { cwd, env },
  );
  const configTwo = spawnSync(
    'git',
    ['config', '--local', 'merge.npm-merge-driver-install.driver', `node '${mergePath}' %A %O %B %P`],
    { cwd, env },
  );

  if (configOne.status !== 0 || configTwo.status !== 0) {
    logger.log('Failed to configure npm-merge-driver-install in git directory');
    return 1;
  }

  // add to attributes file
  const attrFile = path.join(infoDir, 'attributes');
  let attrContents = '';

  if (fs.existsSync(attrFile)) {
    attrContents = fs.readFileSync(attrFile, 'utf8').trim();
  }

  if (attrContents && !attrContents.match(/[\n\r]$/g)) {
    attrContents += '\n';
  }
  attrContents += 'npm-shrinkwrap.json merge=npm-merge-driver-install\n';
  attrContents += 'package-lock.json merge=npm-merge-driver-install\n';

  fs.writeFileSync(attrFile, attrContents);

  logger.log('installed successfully');

  return 0;
};

export default install;

// The code below will only run when working as an executable
// that way we can test the cli using import in unit tests.
const isMainModule = fs.realpathSync(fileURLToPath(import.meta.url)) === fs.realpathSync(process.argv[1]);

if (isMainModule) {
  const exitCode = install();

  process.exit(exitCode);
}
