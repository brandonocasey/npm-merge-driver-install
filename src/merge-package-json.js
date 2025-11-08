import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import process from 'node:process';
import parseConflictJson from 'parse-conflict-json';
import { log } from './logger.js';
import { hasConflictMarkers } from './utils/conflict-detection.js';
import { getGitConfig } from './utils/git-helpers.js';

/**
 * Merges package.json file using git merge-file and parse-conflict-json.
 *
 * @param {string} currentVersion - Path to current version
 * @param {string} ancestorVersion - Path to ancestor version
 * @param {string} otherVersion - Path to other version
 * @param {string} file - Path to output file
 * @param {string} rootDir - Repository root directory
 */
export function mergePackageJson(currentVersion, ancestorVersion, otherVersion, file, rootDir) {
  log(`attempting to merge package.json`);

  // Check if package.json conflict resolution is enabled
  // biome-ignore lint/security/noSecrets: False positive - this is a git config key, not a secret
  const strategy = getGitConfig('merge.npm-merge-driver-install.resolvePackageJson', rootDir);

  if (!strategy) {
    log(`ERROR: package.json merge driver called but resolvePackageJson is not configured`);
    process.exit(1);
  }

  log(`resolving package.json conflicts using '${strategy}' strategy`);

  try {
    // First, try git merge-file to create conflict markers
    log(`attempting text-based merge with git merge-file`);
    const ret = spawnSync('git', ['merge-file', '-p', currentVersion, ancestorVersion, otherVersion], {
      stdio: [0, 'pipe', 2],
    });

    log(`git merge-file exit status: ${ret.status}`);

    if (!ret.stdout) {
      log(`ERROR: git merge-file produced no output`);
      process.exit(1);
    }

    const conflictContent = ret.stdout.toString();

    // If there are conflict markers, resolve them
    if (hasConflictMarkers(conflictContent)) {
      log(`resolving conflicts using '${strategy}' strategy`);
      const resolved = parseConflictJson(conflictContent, null, strategy);
      const resolvedContent = `${JSON.stringify(resolved, null, 2)}\n`;

      fs.writeFileSync(currentVersion, resolvedContent);
      fs.writeFileSync(file, resolvedContent);
      log(`package.json conflicts resolved successfully using '${strategy}' strategy`);
    } else {
      // No conflicts, just write the merged result
      fs.writeFileSync(currentVersion, conflictContent);
      fs.writeFileSync(file, conflictContent);
      log(`package.json merged successfully (no conflicts)`);
    }

    process.exit(0);
  } catch (error) {
    log(`ERROR: Failed to merge package.json: ${error.message}`);
    log(`Current version path: ${currentVersion}`);
    log(`Ancestor version path: ${ancestorVersion}`);
    log(`Other version path: ${otherVersion}`);
    log(`File path: ${file}`);
    process.exit(1);
  }
}
