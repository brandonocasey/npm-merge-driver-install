import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import parseConflictJson from 'parse-conflict-json';
import { log, logActionRequired } from './logger.js';
import { hasConflictMarkers } from './utils/conflict-detection.js';
import { getFileFromIndex, getGitConfig, hasUnmergedEntries, stageFile } from './utils/git-helpers.js';

/**
 * Gets conflict content from git index or working directory.
 *
 * @param {string} packageJsonPath - Path to package.json
 * @param {string} relativePackageJsonPath - Relative path to package.json
 * @param {string} rootDir - Repository root directory
 * @return {{conflictContent: string, shouldStage: boolean}|null} Conflict info or null if no conflicts
 */
function getConflictContent(packageJsonPath, relativePackageJsonPath, rootDir) {
  // Check if package.json has conflicts in git's index
  if (hasUnmergedEntries(relativePackageJsonPath, rootDir)) {
    log(`package.json has unmerged entries in git index`);

    // Get the different versions from git's index
    const currentContent = getFileFromIndex(':2:', relativePackageJsonPath, rootDir);
    const otherContent = getFileFromIndex(':3:', relativePackageJsonPath, rootDir);

    if (currentContent && otherContent) {
      // Create a conflict-marked version to feed to parseConflictJson
      const conflictContent = `<<<<<<< ours\n${currentContent}\n=======\n${otherContent}\n>>>>>>> theirs\n`;
      log(`successfully retrieved conflicting package.json versions from git index`);
      return { conflictContent, shouldStage: true };
    }

    log(`WARNING: failed to retrieve valid package.json versions from git index`);
    return null;
  }

  // Fallback: check if working directory file has conflict markers
  if (fs.existsSync(packageJsonPath)) {
    const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf8');

    if (hasConflictMarkers(packageJsonContent)) {
      log(`package.json in working directory has conflict markers`);
      return { conflictContent: packageJsonContent, shouldStage: false };
    }

    log(`package.json exists but has no conflict markers`);
    return null;
  }

  log(`package.json does not exist at ${packageJsonPath}`);
  return null;
}

/**
 * Attempts to automatically resolve package.json conflicts.
 * This function checks if package.json has conflicts and resolves them
 * using the configured strategy.
 *
 * @param {string} lockfilePath - Path to the lockfile being merged
 * @param {string} rootDir - Repository root directory
 * @param {Object} packageManager - Package manager configuration
 */
export function resolvePackageJsonConflicts(lockfilePath, rootDir, packageManager) {
  const packageJsonPath = path.join(path.dirname(lockfilePath), 'package.json');
  // biome-ignore lint/security/noSecrets: False positive - this is a git config key, not a secret
  const strategy = getGitConfig('merge.npm-merge-driver-install.resolvePackageJson', rootDir);

  if (!strategy) {
    // Package.json conflict resolution not enabled
    return;
  }

  log(`package.json conflict resolution is enabled with strategy: ${strategy}`);

  const relativePackageJsonPath = path.relative(rootDir, packageJsonPath);
  const conflictInfo = getConflictContent(packageJsonPath, relativePackageJsonPath, rootDir);

  if (!conflictInfo) {
    return;
  }

  const { conflictContent, shouldStage } = conflictInfo;

  log(`package.json has conflicts, attempting automatic resolution using '${strategy}' strategy`);

  try {
    const resolved = parseConflictJson(conflictContent, null, strategy);
    fs.writeFileSync(packageJsonPath, `${JSON.stringify(resolved, null, 2)}\n`);

    // Mark package.json as resolved in git index (if it was in the index)
    if (shouldStage) {
      const staged = stageFile(relativePackageJsonPath, rootDir);
      if (!staged) {
        log(`ERROR: Failed to stage resolved package.json`);
        logActionRequired(packageManager, 'Manually stage package.json');
        process.exit(1);
      }
    }

    log(`package.json conflicts resolved successfully using '${strategy}' strategy`);
  } catch (error) {
    log(`ERROR: Failed to auto-resolve package.json conflicts: ${error.message}`);
    logActionRequired(packageManager, 'Manually resolve package.json conflicts');
    process.exit(1);
  }
}

/**
 * Validates that package.json doesn't have unresolved conflicts.
 * Exits with error if conflicts are found.
 *
 * @param {string} lockfilePath - Path to the lockfile being merged
 * @param {Object} packageManager - Package manager configuration
 */
export function validatePackageJsonResolved(lockfilePath, packageManager) {
  const packageJsonPath = path.join(path.dirname(lockfilePath), 'package.json');

  if (!fs.existsSync(packageJsonPath)) {
    return;
  }

  const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf8');

  if (hasConflictMarkers(packageJsonContent)) {
    log(`ERROR: package.json still has unresolved conflicts`);
    logActionRequired(packageManager, 'Resolve package.json conflicts');
    process.exit(1);
  }
}
