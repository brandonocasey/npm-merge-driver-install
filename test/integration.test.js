import fs from 'node:fs';
import path from 'node:path';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from 'vitest';
import { getGitDir } from '../src/get-git-dir.js';
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

  test('installs git attributes for all package managers', () => {
    const gitDir = getGitDir(context.dir);
    const attrFile = path.join(gitDir, 'info', 'attributes');

    expect(fs.existsSync(attrFile)).toBe(true);

    const content = fs.readFileSync(attrFile, 'utf8');

    expect(content).toMatch(/package-lock\.json merge=npm-merge-driver-install/);
    expect(content).toMatch(/npm-shrinkwrap\.json merge=npm-merge-driver-install/);
    expect(content).toMatch(/pnpm-lock\.yaml merge=npm-merge-driver-install/);
    expect(content).toMatch(/yarn\.lock merge=npm-merge-driver-install/);
    expect(content).toMatch(/bun\.lock merge=npm-merge-driver-install/);
    expect(content).toMatch(/bun\.lockb merge=npm-merge-driver-install/);
    expect(content).toMatch(/deno\.lock merge=npm-merge-driver-install/);
  });

  test('configures git merge driver', async () => {
    const result = await promiseSpawn('git', ['config', '--local', '--get', 'merge.npm-merge-driver-install.driver'], {
      cwd: context.dir,
    });

    expect(result.stdout).toMatch(/node.*merge\.js/);
  });

  test('can merge pnpm-lock.yaml changes', async () => {
    try {
      await promiseSpawn('pnpm', ['--version'], { cwd: context.dir });
    } catch (_error) {
      console.warn('pnpm binary not available; skipping pnpm integration test');
      return;
    }

    const packageJsonPath = path.join(context.dir, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

    delete packageJson.dependencies;
    packageJson.devDependencies = { 'not-prerelease': '^1.0.0' };
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

    await promiseSpawn('pnpm', ['install', '--no-frozen-lockfile'], { cwd: context.dir });
    await promiseSpawn('git', ['add', '--all'], { cwd: context.dir });
    await promiseSpawn('git', ['commit', '-m', 'switch to pnpm'], { cwd: context.dir });

    const result = await promiseSpawn('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: context.dir });

    const mainBranch = result.stdout.toString().trim();

    await promiseSpawn('git', ['checkout', '-b', 'pnpm-test'], { cwd: context.dir });

    await promiseSpawn('pnpm', ['add', '-D', 'express'], { cwd: context.dir });
    await promiseSpawn('git', ['add', '--all'], { cwd: context.dir });
    await promiseSpawn('git', ['commit', '-m', 'add express to devDeps'], { cwd: context.dir });

    await promiseSpawn('git', ['checkout', mainBranch], { cwd: context.dir });

    await promiseSpawn('pnpm', ['add', 'express'], { cwd: context.dir });
    await promiseSpawn('git', ['add', '--all'], { cwd: context.dir });
    await promiseSpawn('git', ['commit', '-m', 'add express to deps'], { cwd: context.dir });

    const mergeResult = await promiseSpawn('git', ['merge', '--no-edit', 'pnpm-test'], { cwd: context.dir });

    expect(mergeResult.stdout).toMatch(/pnpm-lock\.yaml merged successfully/);

    const lsResult = await promiseSpawn('git', ['ls-files', '-u'], { cwd: context.dir });

    expect(lsResult.stdout.toString().trim()).toBe('');
  });

  test('can merge yarn.lock changes', async () => {
    try {
      await promiseSpawn('yarn', ['--version'], { cwd: context.dir });
    } catch (_error) {
      console.warn('yarn binary not available; skipping yarn integration test');
      return;
    }

    const packageJsonPath = path.join(context.dir, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

    delete packageJson.dependencies;
    packageJson.devDependencies = { 'not-prerelease': '^1.0.0' };
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

    await promiseSpawn('yarn', ['install'], { cwd: context.dir });
    await promiseSpawn('git', ['add', '--all'], { cwd: context.dir });
    await promiseSpawn('git', ['commit', '-m', 'switch to yarn'], { cwd: context.dir });

    const result = await promiseSpawn('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: context.dir });

    const mainBranch = result.stdout.toString().trim();

    await promiseSpawn('git', ['checkout', '-b', 'yarn-test'], { cwd: context.dir });

    await promiseSpawn('yarn', ['add', '-D', 'express'], { cwd: context.dir });
    await promiseSpawn('git', ['add', '--all'], { cwd: context.dir });
    await promiseSpawn('git', ['commit', '-m', 'add express to devDeps'], { cwd: context.dir });

    await promiseSpawn('git', ['checkout', mainBranch], { cwd: context.dir });

    await promiseSpawn('yarn', ['add', 'express'], { cwd: context.dir });
    await promiseSpawn('git', ['add', '--all'], { cwd: context.dir });
    await promiseSpawn('git', ['commit', '-m', 'add express to deps'], { cwd: context.dir });

    const mergeResult = await promiseSpawn('git', ['merge', '--no-edit', 'yarn-test'], { cwd: context.dir });

    expect(mergeResult.stdout).toMatch(/yarn\.lock merged successfully/);

    const lsResult = await promiseSpawn('git', ['ls-files', '-u'], { cwd: context.dir });

    expect(lsResult.stdout.toString().trim()).toBe('');
  });

  test('can merge bun.lockb changes', async () => {
    try {
      await promiseSpawn('bun', ['--version'], { cwd: context.dir });
    } catch (_error) {
      console.warn('bun binary not available; skipping bun integration test');
      return;
    }

    const packageJsonPath = path.join(context.dir, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

    delete packageJson.dependencies;
    packageJson.devDependencies = { 'not-prerelease': '^1.0.0' };
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

    await promiseSpawn('bun', ['install'], { cwd: context.dir });
    await promiseSpawn('git', ['add', '--all'], { cwd: context.dir });
    await promiseSpawn('git', ['commit', '-m', 'switch to bun'], { cwd: context.dir });

    const result = await promiseSpawn('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: context.dir });

    const mainBranch = result.stdout.toString().trim();

    await promiseSpawn('git', ['checkout', '-b', 'bun-test'], { cwd: context.dir });

    await promiseSpawn('bun', ['add', '-D', 'express'], { cwd: context.dir });
    await promiseSpawn('git', ['add', '--all'], { cwd: context.dir });
    await promiseSpawn('git', ['commit', '-m', 'add express to devDeps'], { cwd: context.dir });

    await promiseSpawn('git', ['checkout', mainBranch], { cwd: context.dir });

    await promiseSpawn('bun', ['add', 'express'], { cwd: context.dir });
    await promiseSpawn('git', ['add', '--all'], { cwd: context.dir });
    await promiseSpawn('git', ['commit', '-m', 'add express to deps'], { cwd: context.dir });

    const mergeResult = await promiseSpawn('git', ['merge', '--no-edit', 'bun-test'], { cwd: context.dir });

    expect(mergeResult.stdout).toMatch(/bun\.lockb merged successfully/);

    const lsResult = await promiseSpawn('git', ['ls-files', '-u'], { cwd: context.dir });

    expect(lsResult.stdout.toString().trim()).toBe('');
  });

  test('can merge deno.lock changes', async () => {
    try {
      await promiseSpawn('deno', ['--version'], { cwd: context.dir });
    } catch (_error) {
      console.warn('deno binary not available; skipping deno integration test');
      return;
    }

    const packageJsonPath = path.join(context.dir, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

    delete packageJson.dependencies;
    packageJson.devDependencies = { 'not-prerelease': '^1.0.0' };
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

    // Create a simple deno.json config and a main.ts file
    const denoJsonPath = path.join(context.dir, 'deno.json');
    const mainTsPath = path.join(context.dir, 'main.ts');

    fs.writeFileSync(
      denoJsonPath,
      JSON.stringify(
        {
          imports: {
            'not-prerelease': 'npm:not-prerelease@^1.0.0',
          },
        },
        null,
        2,
      ),
    );
    // biome-ignore lint/security/noSecrets: test data is not a secret
    fs.writeFileSync(mainTsPath, "import notPrerelease from 'not-prerelease';\nconsole.log(notPrerelease);");

    await promiseSpawn('deno', ['cache', 'main.ts'], { cwd: context.dir });
    await promiseSpawn('git', ['add', '--all'], { cwd: context.dir });
    await promiseSpawn('git', ['commit', '-m', 'switch to deno'], { cwd: context.dir });

    const result = await promiseSpawn('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: context.dir });

    const mainBranch = result.stdout.toString().trim();

    await promiseSpawn('git', ['checkout', '-b', 'deno-test'], { cwd: context.dir });

    // Add express as an import
    const denoJson = JSON.parse(fs.readFileSync(denoJsonPath, 'utf8'));

    denoJson.imports.express = 'npm:express@^4.18.0';
    fs.writeFileSync(denoJsonPath, JSON.stringify(denoJson, null, 2));

    await promiseSpawn('deno', ['cache', '--reload', 'main.ts'], { cwd: context.dir });
    await promiseSpawn('git', ['add', '--all'], { cwd: context.dir });
    await promiseSpawn('git', ['commit', '-m', 'add express'], { cwd: context.dir });

    await promiseSpawn('git', ['checkout', mainBranch], { cwd: context.dir });

    // Add a different package
    const denoJsonMain = JSON.parse(fs.readFileSync(denoJsonPath, 'utf8'));

    denoJsonMain.imports.uuid = 'npm:uuid@^9.0.0';
    fs.writeFileSync(denoJsonPath, JSON.stringify(denoJsonMain, null, 2));

    await promiseSpawn('deno', ['cache', '--reload', 'main.ts'], { cwd: context.dir });
    await promiseSpawn('git', ['add', '--all'], { cwd: context.dir });
    await promiseSpawn('git', ['commit', '-m', 'add uuid'], { cwd: context.dir });

    const mergeResult = await promiseSpawn('git', ['merge', '--no-edit', 'deno-test'], { cwd: context.dir });

    expect(mergeResult.stdout).toMatch(/deno\.lock merged successfully/);

    const lsResult = await promiseSpawn('git', ['ls-files', '-u'], { cwd: context.dir });

    expect(lsResult.stdout.toString().trim()).toBe('');
  });
});
