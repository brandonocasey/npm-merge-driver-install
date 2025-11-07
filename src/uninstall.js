#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { getGitDir } from './get-git-dir.js';
import getRoot from './get-root.js';
import { log } from './logger.js';

const RE = /.* merge\s*=\s*npm-merge-driver-install$/;
const RE2 = /.* merge\s*=\s*npm-merge-driver$/;

const uninstall = (cwd, options) => {
  const logger = options?.logger || { log };
  const env = options?.env || process.env;
  const getRoot_ = options?.getRoot || getRoot;
  const getGitDir_ = options?.getGitDir || getGitDir;
  const rootDir = getRoot_(cwd, options);

  // we dont check isInstalled here as isInstalled returns true
  // for full installs only
  if (rootDir) {
    // remove git config settings
    spawnSync('git', ['config', '--local', '--remove-section', 'merge.npm-merge-driver-install'], {
      cwd: rootDir,
      env,
    });

    spawnSync('git', ['config', '--local', '--remove-section', 'merge.npm-merge-driver'], { cwd: rootDir, env });

    const gitDir = getGitDir_(rootDir, options);

    if (gitDir) {
      const attrFile = path.join(gitDir, 'info', 'attributes');

      // remove git attributes
      if (fs.existsSync(attrFile)) {
        let attrContents = '';

        try {
          attrContents = fs
            .readFileSync(attrFile, 'utf8')
            .split(/\r?\n/)
            .filter((line) => !(line.match(RE) || line.match(RE2)))
            .join('\n');
        } catch (_e) {
          // some issue we cannot handle
        }

        fs.writeFileSync(attrFile, attrContents);
      }
    }
  }

  logger.log('uninstalled successfully');

  return 0;
};

export default uninstall;

// The code below will only run when working as an executable
// that way we can test the cli using import in unit tests.
if (fs.realpathSync(fileURLToPath(import.meta.url)) === fs.realpathSync(process.argv[1])) {
  const exitCode = uninstall();

  process.exit(exitCode);
}
