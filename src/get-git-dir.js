import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

/**
 * Gets the actual git directory path, supporting both normal repositories and worktrees.
 * In worktrees, .git is a file containing "gitdir: <path>" instead of a directory.
 *
 * @param {string} rootDir - The root directory of the repository
 * @param {Object} options - Options object
 * @param {Object} options.env - Environment variables to use
 * @return {string} The path to the git directory, or empty string if not found
 */
const getGitDir = (rootDir, options) => {
  const env = options?.env || process.env;

  if (!rootDir) {
    return '';
  }

  // Use git rev-parse --git-dir to get the actual git directory
  // This works for both normal repos and worktrees
  const gitDirResult = spawnSync('git', ['rev-parse', '--git-dir'], { cwd: rootDir, env });

  if (gitDirResult.status !== 0) {
    return '';
  }

  const gitDir = gitDirResult.stdout ? gitDirResult.stdout.toString().trim() : '';

  if (!gitDir) {
    return '';
  }

  // Convert to absolute path if relative
  const absoluteGitDir = path.isAbsolute(gitDir) ? gitDir : path.join(rootDir, gitDir);

  // Verify the git directory exists
  if (!fs.existsSync(absoluteGitDir)) {
    return '';
  }

  return absoluteGitDir;
};

/**
 * Gets the common git directory path, which contains shared configuration.
 * In worktrees, this returns the main repository's .git directory.
 * In normal repos, this returns the same as --git-dir.
 *
 * @param {string} rootDir - The root directory of the repository
 * @param {Object} options - Options object
 * @param {Object} options.env - Environment variables to use
 * @return {string} The path to the common git directory, or empty string if not found
 */
const getGitCommonDir = (rootDir, options) => {
  const env = options?.env || process.env;

  if (!rootDir) {
    return '';
  }

  // Use git rev-parse --git-common-dir to get the common git directory
  // This is where shared config lives in worktrees
  const gitCommonDirResult = spawnSync('git', ['rev-parse', '--git-common-dir'], { cwd: rootDir, env });

  if (gitCommonDirResult.status !== 0) {
    return '';
  }

  const gitCommonDir = gitCommonDirResult.stdout ? gitCommonDirResult.stdout.toString().trim() : '';

  if (!gitCommonDir) {
    return '';
  }

  // Convert to absolute path if relative
  const absoluteGitCommonDir = path.isAbsolute(gitCommonDir) ? gitCommonDir : path.join(rootDir, gitCommonDir);

  // Verify the common git directory exists
  if (!fs.existsSync(absoluteGitCommonDir)) {
    return '';
  }

  return absoluteGitCommonDir;
};

export { getGitDir, getGitCommonDir };
