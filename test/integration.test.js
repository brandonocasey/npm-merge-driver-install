import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from 'vitest';
import { promiseSpawn, sharedHooks } from './helpers.js';

describe('integration', () => {
  const context = {};

  beforeAll(async () => {
    await sharedHooks.before(context);
  });

  beforeEach(async () => {
    sharedHooks.beforeEach(context);

    await context.installPackage();
    await promiseSpawn('npx', ['--no-install', 'npm-merge-driver-install'], { cwd: context.dir });
    await promiseSpawn('npm', ['i', '--package-lock-only', '-D', 'not-prerelease'], { cwd: context.dir });
    await promiseSpawn('git', ['add', '--all'], { cwd: context.dir });
    await promiseSpawn('git', ['commit', '-a', '-m', '"add not-prerelease to dev deps"'], { cwd: context.dir });
  });

  afterEach(() => {
    sharedHooks.afterEach(context);
  });

  afterAll(() => {
    sharedHooks.after(context);
  });

  test('can merge package-lock only changes', async () => {
    const branchResult = await promiseSpawn('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: context.dir });
    const mainBranch = branchResult.stdout.toString().trim();

    await promiseSpawn('git', ['checkout', '-b', 'merge-driver-test'], { cwd: context.dir });
    await promiseSpawn('npm', ['i', '--package-lock-only', '-D', 'express'], { cwd: context.dir });
    await promiseSpawn('git', ['add', '--all'], { cwd: context.dir });
    await promiseSpawn('git', ['commit', '-a', '-m', '"add express to dev deps"'], { cwd: context.dir });
    await promiseSpawn('git', ['checkout', mainBranch], { cwd: context.dir });
    await promiseSpawn('npm', ['i', '--package-lock-only', 'express'], { cwd: context.dir });
    await promiseSpawn('git', ['add', '--all'], { cwd: context.dir });
    await promiseSpawn('git', ['commit', '-a', '-m', '"add express as dep"'], { cwd: context.dir });
    const mergeResult = await promiseSpawn('git', ['merge', '--no-edit', 'merge-driver-test'], { cwd: context.dir });

    expect(mergeResult.stdout).toMatch(/npm-merge-driver-install: package-lock.json merged successfully/);

    const lsResult = await promiseSpawn('git', ['ls-files', '-u'], { cwd: context.dir });
    // if we get nothing back from ls-files
    // everything was merged!
    expect(lsResult.stdout).toBeFalsy();
    expect(lsResult.stderr).toBeFalsy();
  });
});
