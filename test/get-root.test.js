import fs from 'node:fs';
import path from 'node:path';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from 'vitest';
import getGitDir from '../src/get-git-dir.js';
import { sharedHooks } from './helpers.js';

describe('get-git-dir', () => {
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

  test('can find git dir when it exists', () => {
    const result = getGitDir(context.dir);

    expect(result).toBeTruthy();
    expect(result.endsWith('.git')).toBe(true);
  });

  test('can find git dir from sub directory', () => {
    const result = getGitDir(path.join(context.dir, 'subdir'));

    expect(result).toBeTruthy();
    expect(result.endsWith('.git')).toBe(true);
  });

  test('no git dir without .git', () => {
    fs.rmSync(path.join(context.dir, '.git'), { recursive: true, force: true });
    const result = getGitDir(context.dir);

    expect(result).toBeFalsy();
  });

  test('fails due to bad git executable', () => {
    const env = context.fakegit();
    const result = getGitDir(context.dir, { env });

    expect(result).toBeFalsy();
  });

  test('fails without git executable', () => {
    const result = getGitDir(context.dir, { env: { PATH: '' } });

    expect(result).toBeFalsy();
  });

  test('can use process.cwd()', () => {
    const result = getGitDir(null, {
      process: { cwd: () => context.dir },
    });

    expect(result).toBeTruthy();
  });

  test('can use INIT_CWD', () => {
    const result = getGitDir(null, {
      env: { INIT_CWD: context.dir },
    });

    expect(result).toBeTruthy();
  });
});
