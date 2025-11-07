import fs from 'node:fs';
import path from 'node:path';
import detectYarnVersion from './detect-yarn-version.js';
import { getAllLockfilePatterns, packageManagers } from './package-managers.js';

function detectYarn(rootDir, lockfilePath, lockfile) {
  const yarnVersion = detectYarnVersion(rootDir);
  const pmKey = yarnVersion === 'berry' ? 'yarn-berry' : 'yarn-classic';

  return {
    ...packageManagers[pmKey],
    lockfilePath,
    lockfile,
  };
}

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

function detectPackageManagers(rootDir) {
  const detected = [];
  const detectedNames = new Set();
  const lockfilePatterns = getAllLockfilePatterns();

  for (const lockfile of lockfilePatterns) {
    const lockfilePath = path.join(rootDir, lockfile);

    if (!fs.existsSync(lockfilePath)) {
      continue;
    }

    const filename = lockfile;
    let pmInfo = null;

    if (filename === 'yarn.lock') {
      pmInfo = detectYarn(rootDir, lockfilePath, lockfile);
    } else {
      pmInfo = detectOtherPackageManager(filename, lockfilePath, lockfile);
    }

    if (pmInfo && !detectedNames.has(pmInfo.name)) {
      detected.push(pmInfo);
      detectedNames.add(pmInfo.name);
    }
  }

  return detected;
}

export default detectPackageManagers;
