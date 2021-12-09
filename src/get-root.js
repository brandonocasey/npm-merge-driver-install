const spawnSync = require('child_process').spawnSync;
const fs = require('fs');
const path = require('path');

const getRoot = (cwd) => {
  if (!cwd) {
    cwd = process.env.INIT_CWD ? process.env.INIT_CWD : process.cwd();
  }
  const gitRootResult = spawnSync('git', ['rev-parse', '--show-toplevel'], {cwd});
  const rootDir = gitRootResult.stdout ? gitRootResult.stdout.toString().trim() : '';

  if (gitRootResult.status !== 0 || !rootDir || !fs.existsSync(path.join(rootDir, '.git'))) {
    return '';
  }

  return rootDir;
};

module.exports = getRoot;
