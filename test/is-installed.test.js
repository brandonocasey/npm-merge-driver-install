import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from 'vitest';
import install from '../src/install.js';
import isInstalled from '../src/is-installed.js';
import noop from '../src/noop.js';
import uninstall from '../src/uninstall.js';
import { BASE_DIR, promiseSpawn, sharedHooks } from './helpers.js';

describe('is-installed', () => {
  const context = {};

  beforeAll(async () => {
    await sharedHooks.before(context);
  });

  beforeEach(() => {
    sharedHooks.beforeEach(context);

    context.install = () => install(context.dir, { logger: { log: noop } });
    context.uninstall = () => uninstall(context.dir, { logger: { log: noop } });
  });

  afterEach(() => {
    sharedHooks.afterEach(context);
  });

  afterAll(() => {
    sharedHooks.after(context);
  });

  test('not installed by default', () => {
    expect(isInstalled(context.dir)).toBe(false);
  });

  test('installed after install', () => {
    context.install();
    expect(isInstalled(context.dir)).toBe(true);
  });

  test('not installed after uninstall', () => {
    context.install();
    context.uninstall();
    expect(isInstalled(context.dir)).toBe(false);
  });

  test('not installed without .git', () => {
    fs.rmSync(path.join(context.dir, '.git'), { recursive: true, force: true });

    expect(isInstalled(context.dir)).toBe(false);
  });

  test('not installed with bad git binary', () => {
    context.install();
    const env = context.fakegit();

    expect(isInstalled(context.dir, { env })).toBe(false);
  });

  test('not installed without git binary', () => {
    context.install();
    expect(isInstalled(context.dir, { env: { PATH: '' } })).toBe(false);
  });

  test('still installed with out .git/config but with attributes', () => {
    context.install();
    fs.rmSync(path.join(context.dir, '.git', 'config'), { force: true });
    expect(isInstalled(context.dir)).toBe(true);
  });

  test('still installed with out .git/info buh with config', () => {
    context.install();
    fs.rmSync(path.join(context.dir, '.git', 'info'), { recursive: true, force: true });
    expect(isInstalled(context.dir)).toBe(true);
  });

  test('still installed with out .git/info/attributes but with config', () => {
    context.install();
    fs.rmSync(path.join(context.dir, '.git', 'info', 'attributes'), { force: true });
    expect(isInstalled(context.dir)).toBe(true);
  });

  test('installed with missing config install', () => {
    context.install();
    fs.writeFileSync(path.join(context.dir, '.git', 'config'), 'foo');
    expect(isInstalled(context.dir)).toBe(true);
  });

  test('installed with missing attr install', () => {
    context.install();
    fs.writeFileSync(path.join(context.dir, '.git', 'info', 'attributes'), 'foo');
    expect(isInstalled(context.dir)).toBe(true);
  });

  // windows can't run install.js as a binary
  if (os.platform() !== 'win32') {
    test('exit code 0 if installed and run as binary', async () => {
      context.install();

      const result = await promiseSpawn(path.join(BASE_DIR, 'src', 'is-installed.js'), [], { cwd: context.dir });
      expect(result.exitCode).toBe(0);
      expect(result.stderr).toBe('');
      expect(result.stdout).toBe('');
    });

    test('exit code 1 if not installed and run as binary', async () => {
      const result = await promiseSpawn(path.join(BASE_DIR, 'src', 'is-installed.js'), [], {
        cwd: context.dir,
        ignoreExitCode: true,
      });
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toBe('');
      expect(result.stdout).toBe('');
    });
  }

  test('exit code 0 if installed and run with node', async () => {
    context.install();

    const result = await promiseSpawn('node', [path.join(BASE_DIR, 'src', 'is-installed.js')], { cwd: context.dir });
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toBe('');
  });

  test('exit code 1 if not installed and run with node', async () => {
    const result = await promiseSpawn('node', [path.join(BASE_DIR, 'src', 'is-installed.js')], {
      cwd: context.dir,
      ignoreExitCode: true,
    });
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toBe('');
    expect(result.stdout).toBe('');
  });
});
