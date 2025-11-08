import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { log, logActionRequired } from './logger.js';
import { hasConflictMarkers } from './utils/conflict-detection.js';

/**
 * Attempts text-based merge of lockfile using git merge-file.
 *
 * @param {string} currentVersion - Path to current version
 * @param {string} ancestorVersion - Path to ancestor version
 * @param {string} otherVersion - Path to other version
 * @param {string} file - Path to output file
 * @param {boolean} supportsTextMerge - Whether this lockfile supports text merge
 * @return {boolean} True if text merge had conflicts
 */
export function attemptTextMerge(currentVersion, ancestorVersion, otherVersion, file, supportsTextMerge) {
  if (!supportsTextMerge) {
    log(`${file} is binary format, skipping text-based merge`);
    return false;
  }

  log(`attempting text-based merge for ${file}`);
  const ret = spawnSync('git', ['merge-file', '-p', currentVersion, ancestorVersion, otherVersion], {
    stdio: [0, 'pipe', 2],
  });

  log(`git merge-file exit status: ${ret.status}`);

  const mergeOutput = ret.stdout?.toString() || '';
  const hadConflicts = ret.status !== 0 || hasConflictMarkers(mergeOutput);

  if (hadConflicts) {
    log('text-based merge had conflicts, relying on package manager to regenerate');
    if (hasConflictMarkers(mergeOutput)) {
      log('text-based merge output contains conflict markers');
    }
  }

  try {
    fs.writeFileSync(file, ret.stdout);
  } catch (error) {
    log(`ERROR: Failed to write merged content to ${file}: ${error.message}`);
    process.exit(1);
  }

  return hadConflicts;
}

/**
 * Removes conflicted lockfile so package manager can regenerate it.
 *
 * @param {string} file - Path to lockfile
 * @param {boolean} hadTextMergeConflicts - Whether text merge had conflicts
 */
export function removeConflictedLockfile(file, hadTextMergeConflicts) {
  if (!(hadTextMergeConflicts && fs.existsSync(file))) {
    return;
  }

  try {
    fs.unlinkSync(file);
    log(`removed conflicted lockfile to allow package manager to regenerate it`);
  } catch (error) {
    log(`WARNING: Failed to remove conflicted lockfile: ${error.message}`);
  }
}

/**
 * Runs package manager to regenerate lockfile.
 *
 * @param {Object} packageManager - Package manager configuration
 * @param {string} file - Path to lockfile
 * @return {Object} Spawn result
 */
export function runPackageManager(packageManager, file) {
  const commandParts = packageManager.getCommand();
  const args = packageManager.getMergeArgs();

  const command = commandParts[0];
  const commandArgs = commandParts.slice(1);
  const allArgs = [...commandArgs, ...args];

  log(`running ${command} with args: ${allArgs.join(' ')}`);

  // On Windows, .cmd and .bat files need shell: true to execute
  // This is safe because we're using an array of args (not string concatenation)
  const needsShell = process.platform === 'win32' && (command.endsWith('.cmd') || command.endsWith('.bat'));

  const result = spawnSync(command, allArgs, {
    cwd: path.dirname(file),
    encoding: 'utf8',
    shell: needsShell,
  });

  if (result.status !== 0) {
    log(`ERROR: Failed to merge ${file}`);
    if (result.stdout) {
      log(`stdout: ${result.stdout}`);
    }
    if (result.stderr) {
      log(`stderr: ${result.stderr}`);
    }
    logActionRequired(packageManager, 'Resolve package.json conflicts');
    process.exit(1);
  }

  return result;
}

/**
 * Finalizes the merge by writing the merged content to the output file.
 *
 * @param {string} currentVersion - Path to write final merged content
 * @param {string} file - Path to merged lockfile
 */
export function finalizeMerge(currentVersion, file) {
  try {
    const mergedContent = fs.readFileSync(file);
    fs.writeFileSync(currentVersion, mergedContent);
    log(`${file} merged successfully`);
  } catch (error) {
    log(`ERROR: Failed to finalize merge for ${file}: ${error.message}`);
    process.exit(1);
  }
}
