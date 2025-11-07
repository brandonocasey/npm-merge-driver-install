import { spawnSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

const getGitDir = (cwd, options) => {
  const process_ = options?.process || process;
  const env = options?.env || process.env;

  let workingDir = cwd;
  if (!workingDir) {
    workingDir = env.INIT_CWD ? env.INIT_CWD : process_.cwd();
  }
  const gitDirResult = spawnSync('git', ['rev-parse', '--git-dir'], { cwd: workingDir, env });
  const gitDir = gitDirResult.stdout ? gitDirResult.stdout.toString().trim() : '';

  if (gitDirResult.status !== 0 || !gitDir) {
    return '';
  }

  // git-dir might return a relative path like '.git', so resolve to absolute
  return path.resolve(workingDir, gitDir);
};

export default getGitDir;
