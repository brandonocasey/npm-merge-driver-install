import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const getRoot = (cwd, options) => {
  const process_ = options?.process || process;
  const env = options?.env || process.env;

  if (!cwd) {
    cwd = env.INIT_CWD ? env.INIT_CWD : process_.cwd();
  }
  const gitRootResult = spawnSync('git', ['rev-parse', '--show-toplevel'], { cwd, env });
  const rootDir = gitRootResult.stdout ? gitRootResult.stdout.toString().trim() : '';

  if (gitRootResult.status !== 0 || !rootDir) {
    return '';
  }

  // Verify git directory exists (supports both normal repos and worktrees)
  const gitDirPath = path.join(rootDir, '.git');

  if (!fs.existsSync(gitDirPath)) {
    return '';
  }

  // Check if .git is a file (worktree) or directory (normal repo)
  const stats = fs.statSync(gitDirPath);

  if (!(stats.isDirectory() || stats.isFile())) {
    return '';
  }

  return rootDir;
};

export default getRoot;
