#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { getGitDir } from './get-git-dir.js';
import getRoot from './get-root.js';
import { log } from './logger.js';
import noop from './noop.js';
import { getAllLockfilePatterns } from './package-managers.js';
import uninstall from './uninstall.js';

const configureGitMergeDriver = (rootDir, mergePath, env) => {
  const configOne = spawnSync(
    'git',
    ['config', '--local', 'merge.npm-merge-driver-install.name', 'automatically merge package manager lockfiles'],
    { cwd: rootDir, env },
  );
  const configTwo = spawnSync(
    'git',
    ['config', '--local', 'merge.npm-merge-driver-install.driver', `node '${mergePath}' %A %O %B %P`],
    { cwd: rootDir, env },
  );

  return configOne.status === 0 && configTwo.status === 0;
};

const updateGitAttributes = (attrFile, lockfilePatterns) => {
  let attrContents = '';

  if (fs.existsSync(attrFile)) {
    attrContents = fs.readFileSync(attrFile, 'utf8').trim();
  }

  if (attrContents && !attrContents.match(/[\n\r]$/g)) {
    attrContents += '\n';
  }

  for (const pattern of lockfilePatterns) {
    attrContents += `${pattern} merge=npm-merge-driver-install\n`;
  }

  fs.writeFileSync(attrFile, attrContents);
};

const install = (cwd, options) => {
  const logger = options?.logger || { log };
  const env = options?.env || process.env;
  const getRoot_ = options?.getRoot || getRoot;
  const getGitDir_ = options?.getGitDir || getGitDir;
  const rootDir = getRoot_(cwd, options);

  if (!rootDir) {
    logger.log('Current working directory is not using git or git is not installed, skipping install.');
    return 1;
  }

  uninstall(rootDir, { logger: { log: noop }, env, getGitDir: getGitDir_ });

  const mergePath = path.relative(rootDir, fileURLToPath(new URL('./merge.js', import.meta.url)));
  const gitDir = getGitDir_(rootDir, options);

  if (!gitDir) {
    logger.log('Failed to get git directory');
    return 1;
  }

  const infoDir = path.join(gitDir, 'info');

  if (!fs.existsSync(infoDir)) {
    fs.mkdirSync(infoDir, { recursive: true });
  }

  // add to git config
  if (!configureGitMergeDriver(rootDir, mergePath, env)) {
    logger.log('Failed to configure npm-merge-driver-install in git directory');
    return 1;
  }

  // add to attributes file
  const attrFile = path.join(infoDir, 'attributes');
  const lockfilePatterns = getAllLockfilePatterns();

  updateGitAttributes(attrFile, lockfilePatterns);

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
