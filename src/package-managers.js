import os from 'node:os';
import process from 'node:process';

const getIsWindows = () => os.platform() === 'win32';

const isWindowsLike = () => {
  return os.platform() === 'win32' || process.env.WSL_DISTRO_NAME !== undefined || process.env.MSYSTEM !== undefined;
};

const packageManagers = {
  npm: {
    name: 'npm',
    lockfiles: ['package-lock.json', 'npm-shrinkwrap.json'],
    getCommand: () => (getIsWindows() ? ['npm.cmd'] : ['npm']),
    getExecutable: () => (getIsWindows() ? 'npm.cmd' : 'npm'),
    getMergeArgs: () => ['install', '--package-lock-only', '--prefer-offline', '--no-audit', '--progress=false'],
    supportsTextMerge: true,
  },
  pnpm: {
    name: 'pnpm',
    lockfiles: ['pnpm-lock.yaml'],
    getCommand: () => (getIsWindows() ? ['pnpm.cmd'] : ['pnpm']),
    getExecutable: () => (getIsWindows() ? 'pnpm.cmd' : 'pnpm'),
    getMergeArgs: () => ['install', '--lockfile-only', '--prefer-offline', '--no-optional'],
    supportsTextMerge: true,
  },
  'yarn-classic': {
    name: 'yarn-classic',
    lockfiles: ['yarn.lock'],
    getCommand: () => (getIsWindows() ? ['yarn.cmd'] : ['yarn']),
    getExecutable: () => (getIsWindows() ? 'yarn.cmd' : 'yarn'),
    getMergeArgs: () => ['install', '--prefer-offline'],
    supportsTextMerge: true,
  },
  'yarn-berry': {
    name: 'yarn-berry',
    lockfiles: ['yarn.lock'],
    getCommand: () => (getIsWindows() ? ['yarn.cmd'] : ['yarn']),
    getExecutable: () => (getIsWindows() ? 'yarn.cmd' : 'yarn'),
    getMergeArgs: () => ['install', '--mode=update-lockfile'],
    supportsTextMerge: true,
  },
  bun: {
    name: 'bun',
    lockfiles: ['bun.lock', 'bun.lockb'],
    getCommand: () => (getIsWindows() ? ['npx.cmd', '--yes', 'bun'] : ['bun']),
    getExecutable: () => (getIsWindows() ? 'npx.cmd --yes bun' : 'bun'),
    getMergeArgs: () => ['install', '--lockfile-only'],
    supportsTextMerge: (file) => file.endsWith('bun.lock'),
  },
  deno: {
    name: 'deno',
    lockfiles: ['deno.lock'],
    getCommand: () => (getIsWindows() ? ['npx.cmd', '--yes', 'deno'] : ['npx', '--yes', 'deno']),
    getExecutable: () => (getIsWindows() ? 'npx.cmd --yes deno' : 'npx --yes deno'),
    getMergeArgs: () => ['install', '--frozen=false'],
    supportsTextMerge: true,
  },
};

/**
 * Gets the package manager configuration based on the lockfile path.
 *
 * @param {string} lockfilePath - Path to the lockfile
 * @return {Object|null} Package manager configuration object or null if not found
 */
function getPackageManagerByLockfile(lockfilePath) {
  const filename = lockfilePath.split(/[\\/]/).pop();

  for (const pm of Object.values(packageManagers)) {
    if (pm.lockfiles.includes(filename)) {
      return pm;
    }
  }

  return null;
}

/**
 * Gets all lockfile patterns from all package managers.
 *
 * @return {string[]} Array of lockfile patterns
 */
function getAllLockfilePatterns() {
  const patterns = new Set();

  for (const pm of Object.values(packageManagers)) {
    for (const lockfile of pm.lockfiles) {
      patterns.add(lockfile);
    }
  }

  return Array.from(patterns);
}

/**
 * Gets all package manager binary names.
 *
 * @return {string[]} Array of binary names
 */
function getPackageManagerBinaries() {
  const binaries = new Set();

  for (const pm of Object.values(packageManagers)) {
    binaries.add(pm.name);
  }

  // Add additional binaries used in tests
  binaries.add('npx');
  binaries.add('yarn-classic');
  binaries.add('yarn-berry');

  return Array.from(binaries);
}

export {
  packageManagers,
  getPackageManagerByLockfile,
  getAllLockfilePatterns,
  getPackageManagerBinaries,
  isWindowsLike,
};
