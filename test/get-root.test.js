import fs from 'node:fs';
import path from 'node:path';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from 'vitest';
import getRoot from '../src/get-root.js';
import { sharedHooks } from './helpers.js';

describe('get-root', () => {
  const context = {};

  beforeAll(async () => {
    await sharedHooks.before(context);
    fs.mkdirSync(path.join(context.template, 'subdir'), { recursive: true });
  });

  beforeEach(() => {
    sharedHooks.beforeEach(context);
  });

  afterEach(() => {
    sharedHooks.afterEach(context);
  });

  afterAll(() => {
    sharedHooks.after(context);
  });

  test('can find root dir when it exists', () => {
    const result = getRoot(context.dir);

    expect(result).toBeTruthy();
    expect(fs.realpathSync(result)).toBe(fs.realpathSync(context.dir));
  });

  test('can find root dir from sub directory', () => {
    const result = getRoot(path.join(context.dir, 'subdir'));

    expect(result).toBeTruthy();
    expect(fs.realpathSync(result)).toBe(fs.realpathSync(context.dir));
  });

  test('no root dir without .git', () => {
    fs.rmSync(path.join(context.dir, '.git'), { recursive: true, force: true });
    const result = getRoot(context.dir);

    expect(result).toBeFalsy();
  });

  test('fails due to bad git executable', () => {
    const env = context.fakegit();
    const result = getRoot(context.dir, { env });

    expect(result).toBeFalsy();
  });

  test('fails without git executable', () => {
    const result = getRoot(context.dir, { env: { PATH: '' } });

    expect(result).toBeFalsy();
  });

  test('can use process.cwd()', () => {
    const result = getRoot(null, {
      process: { cwd: () => context.dir },
    });

    expect(result).toBeTruthy();
  });

  test('can use INIT_CWD', () => {
    const result = getRoot(null, {
      env: { INIT_CWD: context.dir },
    });

    expect(result).toBeTruthy();
  });
});
