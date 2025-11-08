import fs from 'node:fs';
import path from 'node:path';
import { log } from './logger.js';

/**
 * Detects the version of Yarn (classic or berry) based on yarn.lock format.
 *
 * @param {string} rootDir - Root directory containing yarn.lock
 * @return {string|null} 'classic', 'berry', or null if no yarn.lock found or error occurred
 */
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

    log(`Warning: Unknown yarn.lock format in ${rootDir}, defaulting to classic`);

    return 'classic';
  } catch (error) {
    log(`Failed to detect yarn version: ${error.message}`);
    return null;
  }
}

export default detectYarnVersion;
