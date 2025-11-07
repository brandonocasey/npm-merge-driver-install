import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from 'vitest';
import install from '../src/install.js';
import isInstalled from '../src/is-installed.js';
import noop from '../src/noop.js';
import uninstall from '../src/uninstall.js';
import { BASE_DIR, promiseSpawn, sharedHooks } from './helpers.js';

describe('uninstall', () => {
  const context = {};

  beforeAll(async () => {
    await sharedHooks.before(context);
  });

  beforeEach(() => {
    sharedHooks.beforeEach(context);

    context.uninstall = (options) =>
      uninstall(context.dir, {
        logger: context.fakeLogger,
        ...options,
      });

    const exitCode = install(context.dir, { logger: { log: noop } });

    expect(exitCode).toBe(0);
    expect(isInstalled(context.dir)).toBe(true);
  });

  afterEach(() => {
    sharedHooks.afterEach(context);
  });

  afterAll(() => {
    sharedHooks.after(context);
  });

  test('can uninstall', () => {
    const exitCode = context.uninstall();

    expect(isInstalled(context.dir)).toBe(false);
    expect(exitCode).toBe(0);
    expect(context.logs.sort()).toEqual(['uninstalled successfully'].sort());
  });

  test('does not fail without .git', () => {
    fs.rmSync(path.join(context.dir, '.git'), { recursive: true, force: true });
    const exitCode = context.uninstall();

    expect(isInstalled(context.dir)).toBe(false);
    expect(exitCode).toBe(0);
    expect(context.logs.sort()).toEqual(['uninstalled successfully'].sort());
  });

  test('does not fail with bad git binary', () => {
    const env = context.fakegit();
    const exitCode = context.uninstall(null, { env });

    expect(isInstalled(context.dir)).toBe(false);
    expect(exitCode).toBe(0);
    expect(context.logs.sort()).toEqual(['uninstalled successfully'].sort());
  });

  test('does not fail without git binary', () => {
    const exitCode = context.uninstall(null, { env: { PATH: '' } });

    expect(isInstalled(context.dir)).toBe(false);
    expect(exitCode).toBe(0);
    expect(context.logs.sort()).toEqual(['uninstalled successfully'].sort());
  });

  test('does not fail without .git/info directory', () => {
    fs.rmSync(path.join(context.dir, '.git', 'info'), { recursive: true, force: true });
    const exitCode = context.uninstall();

    expect(isInstalled(context.dir)).toBe(false);
    expect(exitCode).toBe(0);
    expect(context.logs.sort()).toEqual(['uninstalled successfully'].sort());
  });

  test('does not fail without existing attributes file', () => {
    const attrFile = path.join(context.dir, '.git', 'info', 'attributes');

    fs.rmSync(attrFile, { force: true });
    const exitCode = context.uninstall();

    expect(isInstalled(context.dir)).toBe(false);
    expect(exitCode).toBe(0);
    expect(context.logs.sort()).toEqual(['uninstalled successfully'].sort());
  });

  // windows can't run install.js as a binary
  if (os.platform() !== 'win32') {
    test('uninstalls if run as binary', async () => {
      const result = await promiseSpawn(path.join(BASE_DIR, 'src', 'uninstall.js'), [], { cwd: context.dir });
      expect(isInstalled(context.dir)).toBe(false);
      expect(result.exitCode).toBe(0);
      expect(result.stderr).toBe('');
      expect(result.stdout).toBe('npm-merge-driver-install: uninstalled successfully\n');
    });
  }

  test('uninstalls if run with node', async () => {
    const result = await promiseSpawn('node', [path.join(BASE_DIR, 'src', 'uninstall.js')], { cwd: context.dir });
    expect(isInstalled(context.dir)).toBe(false);
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toBe('npm-merge-driver-install: uninstalled successfully\n');
  });
});
