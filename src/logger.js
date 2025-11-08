export const log = (...args) => {
  console.log('npm-merge-driver-install:', ...args);
};

/**
 * Logs an ACTION REQUIRED message with the command to run.
 *
 * @param {Object} packageManager - Package manager configuration
 * @param {string} message - The error description
 */
export function logActionRequired(packageManager, message) {
  const command = `${packageManager.getExecutable()} ${packageManager.getMergeArgs().join(' ')}`;
  log(`ACTION REQUIRED: ${message}, then run: ${command}`);
  console.log();
}
