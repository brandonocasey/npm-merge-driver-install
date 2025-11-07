import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from 'vitest';
import install from '../src/install.js';
import isInstalled from '../src/is-installed.js';
import { BASE_DIR, promiseSpawn, sharedHooks } from './helpers.js';

describe('install', () => {
  const context = {};

  beforeAll(async () => {
    await sharedHooks.before(context);
  });

  beforeEach(() => {
    sharedHooks.beforeEach(context);
    context.install = (options) =>
      install(context.dir, {
        logger: context.fakeLogger,
        ...options,
      });
  });

  afterEach(() => {
    sharedHooks.afterEach(context);
  });

  afterAll(() => {
    sharedHooks.after(context);
  });

  test('does not install without .git', () => {
    fs.rmSync(path.join(context.dir, '.git'), { recursive: true, force: true });

    const exitCode = context.install();

    expect(isInstalled(context.dir)).toBe(false);
    expect(exitCode).toBe(1);
    expect(context.logs.sort()).toEqual(
      ['Current working directory is not using git or git is not installed, skipping install.'].sort(),
    );
  });

  test('does not install without git executable', () => {
    const exitCode = context.install({ env: { PATH: '' } });

    expect(isInstalled(context.dir)).toBe(false);
    expect(exitCode).toBe(1);
    expect(context.logs.sort()).toEqual(
      ['Current working directory is not using git or git is not installed, skipping install.'].sort(),
    );
  });

  test('does not install with bad git command', () => {
    const env = context.fakegit();
    const exitCode = context.install({ env });

    expect(isInstalled(context.dir)).toBe(false);
    expect(exitCode).toBe(1);
    expect(context.logs.sort()).toEqual(
      ['Current working directory is not using git or git is not installed, skipping install.'].sort(),
    );
  });

  test('can fail on git config', () => {
    const env = context.fakegit();
    const exitCode = context.install({ env, getGitDir: () => path.join(context.dir, '.git') });

    expect(isInstalled(context.dir)).toBe(false);
    expect(exitCode).toBe(1);
    expect(context.logs.sort()).toEqual(['Failed to configure npm-merge-driver-install in git directory'].sort());
  });

  test('installs as function', () => {
    const exitCode = context.install();

    expect(isInstalled(context.dir)).toBe(true);
    expect(exitCode).toBe(0);
    expect(context.logs.sort()).toEqual(['installed successfully'].sort());
  });

  test('does not install twice', () => {
    const exitCode = context.install();

    expect(isInstalled(context.dir)).toBe(true);
    expect(exitCode).toBe(0);
    expect(context.logs.sort()).toEqual(['installed successfully'].sort());

    const exitCode2 = context.install();

    expect(isInstalled(context.dir)).toBe(true);
    expect(exitCode2).toBe(0);
    expect(context.logs.sort()).toEqual(['installed successfully', 'installed successfully'].sort());
  });

  test('does not fail without .git/info directory', () => {
    fs.rmSync(path.join(context.dir, '.git', 'info'), { recursive: true, force: true });
    const exitCode = context.install();

    expect(isInstalled(context.dir)).toBe(true);
    expect(exitCode).toBe(0);
    expect(context.logs.sort()).toEqual(['installed successfully'].sort());
  });

  test('does not fail with existing attributes file', () => {
    const attrFile = path.join(context.dir, '.git', 'info', 'attributes');

    fs.writeFileSync(attrFile, 'foo');
    const exitCode = context.install();

    expect(isInstalled(context.dir)).toBe(true);
    expect(exitCode).toBe(0);
    expect(context.logs.sort()).toEqual(['installed successfully'].sort());
  });

  // windows can't run install.js as a binary
  if (os.platform() !== 'win32') {
    test('installs if run as binary', async () => {
      const result = await promiseSpawn(path.join(BASE_DIR, 'src', 'install.js'), [], { cwd: context.dir });
      expect(isInstalled(context.dir)).toBe(true);
      expect(result.exitCode).toBe(0);
      expect(result.stderr).toBe('');
      expect(result.stdout).toBe('npm-merge-driver-install: installed successfully\n');
    });
  }

  test('installs if run with node', async () => {
    const result = await promiseSpawn('node', [path.join(BASE_DIR, 'src', 'install.js')], { cwd: context.dir });
    expect(isInstalled(context.dir)).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toBe('npm-merge-driver-install: installed successfully\n');
  });
});
