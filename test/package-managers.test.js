import os from 'node:os';
import { describe, expect, test } from 'vitest';
import { getAllLockfilePatterns, getPackageManagerByLockfile, packageManagers } from '../src/package-managers.js';

// biome-ignore lint/security/noSecrets: function name is not a secret
describe('packageManagers', () => {
  test('packageManagers registry contains expected package managers', () => {
    expect(packageManagers.npm).toBeTruthy();
    expect(packageManagers.pnpm).toBeTruthy();
    expect(packageManagers['yarn-classic']).toBeTruthy();
    expect(packageManagers['yarn-berry']).toBeTruthy();
    expect(packageManagers.bun).toBeTruthy();
    expect(packageManagers.deno).toBeTruthy();
  });

  test('npm package manager has correct configuration', () => {
    const npm = packageManagers.npm;

    expect(npm.name).toBe('npm');
    expect(npm.lockfiles).toEqual(['package-lock.json', 'npm-shrinkwrap.json']);
    expect(npm.supportsTextMerge).toBe(true);
    expect(npm.getExecutable).toBeTruthy();
    expect(npm.getMergeArgs).toBeTruthy();
  });

  test('pnpm package manager has correct configuration', () => {
    const pnpm = packageManagers.pnpm;

    expect(pnpm.name).toBe('pnpm');
    expect(pnpm.lockfiles).toEqual(['pnpm-lock.yaml']);
    expect(pnpm.supportsTextMerge).toBe(true);
  });

  test('bun package manager has correct configuration', () => {
    const bun = packageManagers.bun;

    expect(bun.name).toBe('bun');
    expect(bun.lockfiles).toEqual(['bun.lock', 'bun.lockb']);
    expect(typeof bun.supportsTextMerge).toBe('function');
  });

  // biome-ignore lint/security/noSecrets: test name is not a secret
  test('getPackageManagerByLockfile returns correct package manager for npm', () => {
    const pm = getPackageManagerByLockfile('package-lock.json');

    expect(pm.name).toBe('npm');
  });

  test('getPackageManagerByLockfile returns correct package manager for pnpm', () => {
    const pm = getPackageManagerByLockfile('pnpm-lock.yaml');

    expect(pm.name).toBe('pnpm');
  });

  test('getPackageManagerByLockfile returns correct package manager for yarn', () => {
    const pm = getPackageManagerByLockfile('yarn.lock');

    expect(pm.name).toBe('yarn-classic');
  });

  test('getPackageManagerByLockfile returns correct package manager for bun', () => {
    const pm = getPackageManagerByLockfile('bun.lock');

    expect(pm.name).toBe('bun');
  });

  test('getPackageManagerByLockfile returns correct package manager for deno', () => {
    const pm = getPackageManagerByLockfile('deno.lock');

    expect(pm.name).toBe('deno');
  });

  test('getPackageManagerByLockfile handles paths with directories', () => {
    const pm = getPackageManagerByLockfile('/path/to/package-lock.json');

    expect(pm.name).toBe('npm');
  });

  test('getPackageManagerByLockfile returns null for unknown lockfile', () => {
    const pm = getPackageManagerByLockfile('unknown.lock');

    expect(pm).toBe(null);
  });

  test('getAllLockfilePatterns returns all lockfile patterns', () => {
    const patterns = getAllLockfilePatterns();

    expect(patterns.includes('package-lock.json')).toBe(true);
    expect(patterns.includes('npm-shrinkwrap.json')).toBe(true);
    expect(patterns.includes('pnpm-lock.yaml')).toBe(true);
    expect(patterns.includes('yarn.lock')).toBe(true);
    expect(patterns.includes('bun.lock')).toBe(true);
    expect(patterns.includes('bun.lockb')).toBe(true);
    expect(patterns.includes('deno.lock')).toBe(true);
  });

  test('bun supportsTextMerge function works correctly', () => {
    const bun = packageManagers.bun;

    expect(bun.supportsTextMerge('bun.lock')).toBe(true);
    expect(bun.supportsTextMerge('bun.lockb')).toBe(false);
  });

  test('npm getExecutable returns correct value for current platform', () => {
    const npm = packageManagers.npm;
    const executable = npm.getExecutable();
    const expected = os.platform() === 'win32' ? 'npm.cmd' : 'npm';

    expect(executable).toBe(expected);
  });

  test('pnpm getExecutable returns correct value for current platform', () => {
    const pnpm = packageManagers.pnpm;
    const executable = pnpm.getExecutable();
    const expected = os.platform() === 'win32' ? 'pnpm.cmd' : 'pnpm';

    expect(executable).toBe(expected);
  });

  test('yarn-classic getExecutable returns correct value for current platform', () => {
    const yarn = packageManagers['yarn-classic'];
    const executable = yarn.getExecutable();
    const expected = os.platform() === 'win32' ? 'yarn.cmd' : 'yarn';

    expect(executable).toBe(expected);
  });

  test('yarn-berry getExecutable returns correct value for current platform', () => {
    const yarn = packageManagers['yarn-berry'];
    const executable = yarn.getExecutable();
    const expected = os.platform() === 'win32' ? 'yarn.cmd' : 'yarn';

    expect(executable).toBe(expected);
  });

  test('bun getExecutable returns correct value for current platform', () => {
    const bun = packageManagers.bun;
    const executable = bun.getExecutable();
    const expected = os.platform() === 'win32' ? 'bun.exe' : 'bun';

    expect(executable).toBe(expected);
  });

  test('deno getExecutable returns correct value for current platform', () => {
    const deno = packageManagers.deno;
    const executable = deno.getExecutable();
    const expected = os.platform() === 'win32' ? 'deno.exe' : 'deno';

    expect(executable).toBe(expected);
  });

  test('npm getMergeArgs returns correct arguments', () => {
    const npm = packageManagers.npm;
    const args = npm.getMergeArgs();

    expect(args).toEqual(['install', '--package-lock-only', '--prefer-offline', '--no-audit', '--progress=false']);
  });

  test('pnpm getMergeArgs returns correct arguments', () => {
    const pnpm = packageManagers.pnpm;
    const args = pnpm.getMergeArgs();

    expect(args).toEqual(['install', '--lockfile-only', '--prefer-offline', '--no-optional']);
  });

  test('yarn-classic getMergeArgs returns correct arguments', () => {
    const yarn = packageManagers['yarn-classic'];
    const args = yarn.getMergeArgs();

    expect(args).toEqual(['install', '--frozen-lockfile']);
  });

  test('yarn-berry getMergeArgs returns correct arguments', () => {
    const yarn = packageManagers['yarn-berry'];
    const args = yarn.getMergeArgs();

    expect(args).toEqual(['install', '--mode=skip-build']);
  });

  test('bun getMergeArgs returns correct arguments', () => {
    const bun = packageManagers.bun;
    const args = bun.getMergeArgs();

    expect(args).toEqual(['install', '--frozen-lockfile']);
  });

  test('deno getMergeArgs returns correct arguments', () => {
    const deno = packageManagers.deno;
    const args = deno.getMergeArgs();

    expect(args).toEqual(['cache', '--reload']);
  });

  test('getPackageManagerByLockfile handles Windows-style paths', () => {
    const pm = getPackageManagerByLockfile('C:\\path\\to\\package-lock.json');

    expect(pm.name).toBe('npm');
  });

  test('getPackageManagerByLockfile handles npm-shrinkwrap.json', () => {
    const pm = getPackageManagerByLockfile('npm-shrinkwrap.json');

    expect(pm.name).toBe('npm');
  });

  // biome-ignore lint/security/noSecrets: test name/function name is not a secret
  test('getPackageManagerByLockfile handles bun.lockb', () => {
    const pm = getPackageManagerByLockfile('bun.lockb');

    expect(pm.name).toBe('bun');
  });
});
