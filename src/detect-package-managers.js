import fs from 'node:fs';
import path from 'node:path';
import detectYarnVersion from './detect-yarn-version.js';
import { getAllLockfilePatterns, packageManagers } from './package-managers.js';

/**
 * Detects the Yarn version (classic or berry) for a given yarn.lock file.
 *
 * @param {string} rootDir - Root directory containing the lockfile
 * @param {string} lockfilePath - Full path to the yarn.lock file
 * @param {string} lockfile - Filename of the lockfile
 * @return {Object} Package manager info object
 */
function detectYarn(rootDir, lockfilePath, lockfile) {
  const yarnVersion = detectYarnVersion(rootDir);
  const pmKey = yarnVersion === 'berry' ? 'yarn-berry' : 'yarn-classic';

  return {
    ...packageManagers[pmKey],
    lockfilePath,
    lockfile,
  };
}

/**
 * Detects the package manager for non-Yarn lockfiles.
 *
 * @param {string} filename - Filename of the lockfile
 * @param {string} lockfilePath - Full path to the lockfile
 * @param {string} lockfile - Filename of the lockfile
 * @return {Object|null} Package manager info object or null if not found
 */
function detectOtherPackageManager(filename, lockfilePath, lockfile) {
  for (const pm of Object.values(packageManagers)) {
    if (pm.lockfiles.includes(filename)) {
      return {
        ...pm,
        lockfilePath,
        lockfile,
      };
    }
  }
  return null;
}

/**
 * Detects all package managers in use in the given directory.
 *
 * @param {string} rootDir - Root directory to search for lockfiles
 * @return {Object[]} Array of detected package manager info objects
 */
function detectPackageManagers(rootDir) {
  const detected = [];
  const detectedNames = new Set();
  const lockfilePatterns = getAllLockfilePatterns();

  for (const lockfile of lockfilePatterns) {
    const lockfilePath = path.join(rootDir, lockfile);

    if (!fs.existsSync(lockfilePath)) {
      continue;
    }

    let pmInfo = null;

    if (lockfile === 'yarn.lock') {
      pmInfo = detectYarn(rootDir, lockfilePath, lockfile);
    } else {
      pmInfo = detectOtherPackageManager(lockfile, lockfilePath, lockfile);
    }

    if (pmInfo && !detectedNames.has(pmInfo.name)) {
      detected.push(pmInfo);
      detectedNames.add(pmInfo.name);
    }
  }

  return detected;
}

export default detectPackageManagers;
