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

  if (gitRootResult.status !== 0 || !rootDir || !fs.existsSync(path.join(rootDir, '.git'))) {
    return '';
  }

  return rootDir;
};

module.exports = getRoot;
