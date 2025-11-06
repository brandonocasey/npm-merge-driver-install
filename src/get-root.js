const spawnSync = require('child_process').spawnSync;
const fs = require('fs');
const path = require('path');

const getRoot = (cwd, options) => {
  const process_ = options && options.process || process;
  const env = options && options.env || process.env;

  if (!cwd) {
    cwd = env.INIT_CWD ? env.INIT_CWD : process_.cwd();
  }
  const gitRootResult = spawnSync('git', ['rev-parse', '--show-toplevel'], {cwd, env});
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

  if (!stats.isDirectory() && !stats.isFile()) {
    return '';
  }

  return rootDir;
};

module.exports = getRoot;
