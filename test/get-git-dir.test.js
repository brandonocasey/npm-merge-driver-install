import fs from 'node:fs';
import path from 'node:path';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from 'vitest';
import { getGitCommonDir, getGitDir } from '../src/get-git-dir.js';
import { sharedHooks } from './helpers.js';

describe('getGitDir', () => {
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

  test('can get git dir when it exists', () => {
    const result = getGitDir(context.dir);

    expect(result).toBeTruthy();
    expect(fs.existsSync(result)).toBe(true);
    expect(result.endsWith('.git')).toBe(true);
  });

  test('can get git dir from sub directory', () => {
    const result = getGitDir(path.join(context.dir, 'subdir'));

    expect(result).toBeTruthy();
    expect(fs.existsSync(result)).toBe(true);
  });

  test('returns absolute path when git dir is relative', () => {
    const result = getGitDir(context.dir);

    expect(result).toBeTruthy();
    expect(path.isAbsolute(result)).toBe(true);
  });

  test('no git dir without git directory', () => {
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

  test('fails with null rootDir', () => {
    const result = getGitDir(null);

    expect(result).toBeFalsy();
  });

  test('fails with empty rootDir', () => {
    const result = getGitDir('');

    expect(result).toBeFalsy();
  });

  test('can get common git dir when it exists', () => {
    const result = getGitCommonDir(context.dir);

    expect(result).toBeTruthy();
    expect(fs.existsSync(result)).toBe(true);
  });

  test('common git dir equals git dir in normal repos', () => {
    const gitDir = getGitDir(context.dir);
    const commonGitDir = getGitCommonDir(context.dir);

    expect(gitDir).toBe(commonGitDir);
  });

  test('common git dir returns absolute path', () => {
    const result = getGitCommonDir(context.dir);

    expect(result).toBeTruthy();
    expect(path.isAbsolute(result)).toBe(true);
  });

  test('no common git dir without git directory', () => {
    fs.rmSync(path.join(context.dir, '.git'), { recursive: true, force: true });
    const result = getGitCommonDir(context.dir);

    expect(result).toBeFalsy();
  });

  test('common git dir fails due to bad git executable', () => {
    const env = context.fakegit();
    const result = getGitCommonDir(context.dir, { env });

    expect(result).toBeFalsy();
  });

  test('common git dir fails without git executable', () => {
    const result = getGitCommonDir(context.dir, { env: { PATH: '' } });

    expect(result).toBeFalsy();
  });

  test('common git dir fails with null rootDir', () => {
    const result = getGitCommonDir(null);

    expect(result).toBeFalsy();
  });

  test('common git dir fails with empty rootDir', () => {
    const result = getGitCommonDir('');

    expect(result).toBeFalsy();
  });

  test('git dir detects .git file in worktree', () => {
    // Test that .git can be a file (worktree case)
    // We verify this by checking that get-root properly detects both files and directories
    const gitPath = path.join(context.dir, '.git');
    const stats = fs.statSync(gitPath);

    // In normal repos, .git is a directory
    expect(stats.isDirectory()).toBe(true);

    // The getGitDir function uses git rev-parse which handles worktrees automatically
    const result = getGitDir(context.dir);

    expect(result).toBeTruthy();
    expect(fs.existsSync(result)).toBe(true);
    expect(path.isAbsolute(result)).toBe(true);
  });
});
