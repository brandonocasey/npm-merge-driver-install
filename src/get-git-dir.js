const spawnSync = require('child_process').spawnSync;
const path = require('path');

const getGitDir = (cwd, options) => {
  const process_ = options && options.process || process;
  const env = options && options.env || process.env;

  if (!cwd) {
    cwd = env.INIT_CWD ? env.INIT_CWD : process_.cwd();
  }
  const gitDirResult = spawnSync('git', ['rev-parse', '--git-dir'], {cwd, env});
  const gitDir = gitDirResult.stdout ? gitDirResult.stdout.toString().trim() : '';

  if (gitDirResult.status !== 0 || !gitDir) {
    return '';
  }

  // git-dir might return a relative path like '.git', so resolve to absolute
  return path.resolve(cwd, gitDir);
};

module.exports = getGitDir;
