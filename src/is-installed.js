#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import getGitDir from './get-git-dir.js';

const inConfig = (gitDir, _options) => {
  const gitConfigPath = path.join(gitDir, 'config');

  if (!fs.existsSync(gitConfigPath)) {
    return false;
  }

  const config = fs.readFileSync(gitConfigPath, 'utf8');

  return /npm-merge-driver-install/i.test(config);
};

const inAttr = (gitDir, _options) => {
  const gitAttrPath = path.join(gitDir, 'info', 'attributes');

  if (!fs.existsSync(gitAttrPath)) {
    return false;
  }

  const attr = fs.readFileSync(gitAttrPath, 'utf8');

  return /npm-merge-driver-install/i.test(attr);
};

const isInstalled = (cwd, options) => {
  const getGitDir_ = options?.getGitDir || getGitDir;
  const gitDir = getGitDir_(cwd, options);

  if (!gitDir) {
    return false;
  }

  return inConfig(gitDir, options) || inAttr(gitDir, options);
};

export default isInstalled;

// The code below will only run when working as an executable
// that way we can test the cli using import in unit tests.
if (fs.realpathSync(fileURLToPath(import.meta.url)) === fs.realpathSync(process.argv[1])) {
  const exitCode = isInstalled() ? 0 : 1;

  process.exit(exitCode);
}
