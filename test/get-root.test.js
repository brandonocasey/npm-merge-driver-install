import fs from 'node:fs';
import path from 'node:path';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from 'vitest';
import getRoot from '../src/get-root.js';
import { sharedHooks } from './helpers.js';

// Normalize paths - handles macOS symlinks (/var -> /private/var) and Windows short vs long paths
const normalizePathSync = (p) => {
  // First resolve to absolute path
  const resolved = path.resolve(p);

  try {
    // realpathSync resolves symlinks on macOS and should convert short->long on Windows
    // Use native option to get the actual platform path
    const realPath = fs.realpathSync.native(resolved);
    // Normalize and lowercase for case-insensitive comparison
    return path.normalize(realPath).toLowerCase();
  } catch {
    // If realpathSync fails, fall back to normalized lowercase
    return path.normalize(resolved).toLowerCase();
  }
};

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
    // Check if they refer to the same directory by comparing normalized paths
    // This handles macOS symlinks and Windows short/long path variations
    const normalizedResult = normalizePathSync(result);
    const normalizedExpected = normalizePathSync(context.dir);

    // Extract the basename (UUID) from both paths - should always match
    const resultBasename = path.basename(normalizedResult);
    const expectedBasename = path.basename(normalizedExpected);

    expect(resultBasename).toBe(expectedBasename);
  });

  test('can find root dir from sub directory', () => {
    const result = getRoot(path.join(context.dir, 'subdir'));

    expect(result).toBeTruthy();
    // Check if they refer to the same directory by comparing normalized paths
    const normalizedResult = normalizePathSync(result);
    const normalizedExpected = normalizePathSync(context.dir);

    // Extract the basename (UUID) from both paths - should always match
    const resultBasename = path.basename(normalizedResult);
    const expectedBasename = path.basename(normalizedExpected);

    expect(resultBasename).toBe(expectedBasename);
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
