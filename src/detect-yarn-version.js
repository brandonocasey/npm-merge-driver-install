import fs from 'node:fs';
import path from 'node:path';

function detectYarnVersion(rootDir) {
  const lockfilePath = path.join(rootDir, 'yarn.lock');

  if (!fs.existsSync(lockfilePath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(lockfilePath, 'utf8');

    if (content.includes('__metadata')) {
      return 'berry';
    }

    if (content.startsWith('# yarn lockfile v1')) {
      return 'classic';
    }

    if (typeof console !== 'undefined' && console.warn) {
      console.warn(`Warning: Unknown yarn.lock format in ${rootDir}, defaulting to classic`);
    }

    return 'classic';
  } catch (_error) {
    return null;
  }
}

export default detectYarnVersion;
