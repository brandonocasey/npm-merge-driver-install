import { spawnSync } from 'node:child_process';

/**
 * Gets a git config value.
 *
 * @param {string} key - Git config key
 * @param {string} cwd - Working directory
 * @return {string|null} Config value or null if not found
 */
export function getGitConfig(key, cwd) {
  const result = spawnSync('git', ['config', '--local', key], {
    cwd,
    encoding: 'utf8',
  });

  if (result.status === 0 && result.stdout.trim()) {
    return result.stdout.trim();
  }

  return null;
}

/**
 * Checks if a file has unmerged entries in git index.
 *
 * @param {string} filePath - Relative path to file from root
 * @param {string} rootDir - Repository root directory
 * @return {boolean} True if file has conflicts in index
 */
export function hasUnmergedEntries(filePath, rootDir) {
  const result = spawnSync('git', ['ls-files', '-u', filePath], {
    cwd: rootDir,
    encoding: 'utf8',
  });

  return result.status === 0 && result.stdout.trim().length > 0;
}

/**
 * Gets file content from git index.
 *
 * @param {string} stage - Git index stage (':2:' for ours, ':3:' for theirs)
 * @param {string} filePath - Relative path to file
 * @param {string} rootDir - Repository root directory
 * @return {string|null} File content or null if not found
 */
export function getFileFromIndex(stage, filePath, rootDir) {
  const result = spawnSync('git', ['show', `${stage}${filePath}`], {
    cwd: rootDir,
    encoding: 'utf8',
  });

  if (result.status === 0 && result.stdout) {
    return result.stdout;
  }

  return null;
}

/**
 * Stages a file in git.
 *
 * @param {string} filePath - Relative path to file
 * @param {string} rootDir - Repository root directory
 * @return {boolean} True if staging succeeded
 */
export function stageFile(filePath, rootDir) {
  const result = spawnSync('git', ['add', filePath], { cwd: rootDir });
  return result.status === 0;
}
