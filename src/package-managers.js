import os from 'node:os';

const getIsWindows = () => os.platform() === 'win32';

const packageManagers = {
  npm: {
    name: 'npm',
    lockfiles: ['package-lock.json', 'npm-shrinkwrap.json'],
    getExecutable: () => (getIsWindows() ? 'npm.cmd' : 'npm'),
    getMergeArgs: () => ['install', '--package-lock-only', '--prefer-offline', '--no-audit', '--progress=false'],
    supportsTextMerge: true,
  },
  pnpm: {
    name: 'pnpm',
    lockfiles: ['pnpm-lock.yaml'],
    getExecutable: () => (getIsWindows() ? 'pnpm.cmd' : 'pnpm'),
    getMergeArgs: () => ['install', '--lockfile-only', '--prefer-offline', '--no-optional'],
    supportsTextMerge: true,
  },
  'yarn-classic': {
    name: 'yarn-classic',
    lockfiles: ['yarn.lock'],
    getExecutable: () => (getIsWindows() ? 'yarn.cmd' : 'yarn'),
    getMergeArgs: () => ['install', '--frozen-lockfile'],
    supportsTextMerge: true,
  },
  'yarn-berry': {
    name: 'yarn-berry',
    lockfiles: ['yarn.lock'],
    getExecutable: () => (getIsWindows() ? 'yarn.cmd' : 'yarn'),
    getMergeArgs: () => ['install', '--mode=skip-build'],
    supportsTextMerge: true,
  },
  bun: {
    name: 'bun',
    lockfiles: ['bun.lock', 'bun.lockb'],
    getExecutable: () => (getIsWindows() ? 'bun.exe' : 'bun'),
    getMergeArgs: () => ['install', '--frozen-lockfile'],
    supportsTextMerge: (file) => file.endsWith('bun.lock'),
  },
  deno: {
    name: 'deno',
    lockfiles: ['deno.lock'],
    getExecutable: () => (getIsWindows() ? 'deno.exe' : 'deno'),
    getMergeArgs: () => ['cache', '--reload'],
    supportsTextMerge: true,
  },
};

function getPackageManagerByLockfile(lockfilePath) {
  const filename = lockfilePath.split(/[\\/]/).pop();

  for (const pm of Object.values(packageManagers)) {
    if (pm.lockfiles.includes(filename)) {
      return pm;
    }
  }

  return null;
}

function getAllLockfilePatterns() {
  const patterns = new Set();

  for (const pm of Object.values(packageManagers)) {
    for (const lockfile of pm.lockfiles) {
      patterns.add(lockfile);
    }
  }

  return Array.from(patterns);
}

export { packageManagers, getPackageManagerByLockfile, getAllLockfilePatterns };
