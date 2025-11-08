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
    await promiseSpawn('npx', ['--no-install', 'npm-merge-driver-install'], {
      cwd: context.dir,
    });
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

  test('can merge yarn.lock changes (Yarn Classic v1)', async () => {
    // Use system yarn if it's v1, otherwise use yarn-classic alias
    let yarnCmd = 'yarn';
    try {
      const versionResult = await promiseSpawn('yarn', ['--version'], { cwd: context.dir });
      const version = versionResult.stdout.toString().trim();
      // If version starts with 2, 3, 4, etc., try yarn-classic alias
      if (!version.startsWith('1.')) {
        try {
          await promiseSpawn('yarn-classic', ['--version'], { cwd: context.dir });
          yarnCmd = 'yarn-classic';
        } catch (_error) {
          console.warn('Yarn Classic (v1) not available; skipping yarn classic integration test');
          return;
        }
      }
    } catch (_error) {
      console.warn('yarn binary not available; skipping yarn classic integration test');
      return;
    }

    const packageJsonPath = path.join(context.dir, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

    delete packageJson.dependencies;
    packageJson.devDependencies = { 'not-prerelease': '^1.0.0' };
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

    await promiseSpawn(yarnCmd, ['install'], { cwd: context.dir });
    await promiseSpawn('git', ['add', '--all'], { cwd: context.dir });
    await promiseSpawn('git', ['commit', '-m', 'switch to yarn classic'], { cwd: context.dir });

    const result = await promiseSpawn('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: context.dir });

    const mainBranch = result.stdout.toString().trim();

    await promiseSpawn('git', ['checkout', '-b', 'yarn-classic-test'], { cwd: context.dir });

    await promiseSpawn(yarnCmd, ['add', '-D', 'express'], { cwd: context.dir });
    await promiseSpawn('git', ['add', '--all'], { cwd: context.dir });
    await promiseSpawn('git', ['commit', '-m', 'add express to devDeps'], { cwd: context.dir });

    await promiseSpawn('git', ['checkout', mainBranch], { cwd: context.dir });

    await promiseSpawn(yarnCmd, ['add', 'express'], { cwd: context.dir });
    await promiseSpawn('git', ['add', '--all'], { cwd: context.dir });
    await promiseSpawn('git', ['commit', '-m', 'add express to deps'], { cwd: context.dir });

    const mergeResult = await promiseSpawn('git', ['merge', '--no-edit', 'yarn-classic-test'], { cwd: context.dir });

    // Either the lockfile was merged successfully or there was no conflict
    expect(mergeResult.stdout).toMatch(/(yarn\.lock merged successfully|Merge made by)/);

    // Verify merge completed successfully
    expect(mergeResult.exitCode).toBe(0);

    const lsResult = await promiseSpawn('git', ['ls-files', '-u'], { cwd: context.dir });

    expect(lsResult.stdout.toString().trim()).toBe('');

    // Verify it's actually Yarn Classic lockfile format
    const yarnLockPath = path.join(context.dir, 'yarn.lock');
    const yarnLockContent = fs.readFileSync(yarnLockPath, 'utf8');
    expect(yarnLockContent).toMatch(/# yarn lockfile v1/);
  });

  test('can merge yarn.lock changes (Yarn Berry v2+)', async () => {
    // Try multiple methods to get Yarn Berry
    let yarnCmd = 'yarn-berry';
    let yarnArgs = [];

    try {
      // Try yarn-berry alias first
      await promiseSpawn('yarn-berry', ['--version'], { cwd: context.dir });
    } catch (_error) {
      // Try system yarn and check if it's v2+
      try {
        const versionResult = await promiseSpawn('yarn', ['--version'], { cwd: context.dir });
        const version = versionResult.stdout.toString().trim();
        // If version starts with 2, 3, 4, etc., use system yarn
        if (!version.startsWith('1.')) {
          yarnCmd = 'yarn';
        } else {
          // Fall back to using npx to run Yarn Berry
          yarnCmd = 'npx';
          yarnArgs = ['--yes', 'yarn@berry'];
        }
      } catch (_error2) {
        // Fall back to using npx to run Yarn Berry
        yarnCmd = 'npx';
        yarnArgs = ['--yes', 'yarn@berry'];
      }
    }

    // Helper function to run yarn commands with proper args
    const runYarn = (args, options) => {
      return promiseSpawn(yarnCmd, [...yarnArgs, ...args], options);
    };

    const packageJsonPath = path.join(context.dir, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

    delete packageJson.dependencies;
    packageJson.devDependencies = { 'not-prerelease': '^1.0.0' };
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

    // Configure git to handle Yarn Berry's binary install-state.gz file
    await promiseSpawn('git', ['config', 'merge.ours.driver', 'true'], { cwd: context.dir });
    const gitAttributesPath = path.join(context.dir, '.git', 'info', 'attributes');
    const gitAttributesDir = path.dirname(gitAttributesPath);
    if (!fs.existsSync(gitAttributesDir)) {
      fs.mkdirSync(gitAttributesDir, { recursive: true });
    }
    const existingAttrs = fs.existsSync(gitAttributesPath) ? fs.readFileSync(gitAttributesPath, 'utf8') : '';
    if (!existingAttrs.includes('.yarn/install-state.gz')) {
      fs.appendFileSync(gitAttributesPath, '.yarn/install-state.gz merge=ours\n');
    }

    await runYarn(['install'], { cwd: context.dir });
    await promiseSpawn('git', ['add', '--all'], { cwd: context.dir });
    await promiseSpawn('git', ['commit', '-m', 'switch to yarn berry'], { cwd: context.dir });

    const result = await promiseSpawn('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: context.dir });

    const mainBranch = result.stdout.toString().trim();

    await promiseSpawn('git', ['checkout', '-b', 'yarn-berry-test'], { cwd: context.dir });

    await runYarn(['add', '-D', 'express'], { cwd: context.dir });
    await promiseSpawn('git', ['add', '--all'], { cwd: context.dir });
    await promiseSpawn('git', ['commit', '-m', 'add express to devDeps'], { cwd: context.dir });

    await promiseSpawn('git', ['checkout', mainBranch], { cwd: context.dir });

    await runYarn(['add', 'express'], { cwd: context.dir });
    await promiseSpawn('git', ['add', '--all'], { cwd: context.dir });
    await promiseSpawn('git', ['commit', '-m', 'add express to deps'], { cwd: context.dir });

    const mergeResult = await promiseSpawn('git', ['merge', '--no-edit', 'yarn-berry-test'], { cwd: context.dir });

    // Either the lockfile was merged successfully or there was no conflict
    expect(mergeResult.stdout).toMatch(/(yarn\.lock merged successfully|Merge made by)/);

    // Verify merge completed successfully
    expect(mergeResult.exitCode).toBe(0);

    const lsResult = await promiseSpawn('git', ['ls-files', '-u'], { cwd: context.dir });

    expect(lsResult.stdout.toString().trim()).toBe('');

    // Verify it's actually Yarn Berry lockfile format
    const yarnLockPath = path.join(context.dir, 'yarn.lock');
    const yarnLockContent = fs.readFileSync(yarnLockPath, 'utf8');
    expect(yarnLockContent).toMatch(/__metadata:/);
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

    // Bun may use either bun.lock (text) or bun.lockb (binary) depending on version/config
    expect(mergeResult.stdout).toMatch(/bun\.lock(b)? merged successfully/);

    const lsResult = await promiseSpawn('git', ['ls-files', '-u'], { cwd: context.dir });

    expect(lsResult.stdout.toString().trim()).toBe('');
  }, 120000); // 2 minute timeout for bun operations on Windows

  test('can merge deno.lock changes', async () => {
    const denoCmd = 'npx';
    const denoArgs = ['--yes', 'deno'];

    try {
      await promiseSpawn(denoCmd, [...denoArgs, '--version'], { cwd: context.dir });
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
    fs.writeFileSync(mainTsPath, "console.log('Hello from Deno');");

    await promiseSpawn(denoCmd, [...denoArgs, 'install'], { cwd: context.dir });
    await promiseSpawn('git', ['add', '--all'], { cwd: context.dir });
    await promiseSpawn('git', ['commit', '-m', 'switch to deno'], { cwd: context.dir });

    const result = await promiseSpawn('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: context.dir });

    const mainBranch = result.stdout.toString().trim();

    await promiseSpawn('git', ['checkout', '-b', 'deno-test'], { cwd: context.dir });

    // Add express as an import
    const denoJson = JSON.parse(fs.readFileSync(denoJsonPath, 'utf8'));

    denoJson.imports.express = 'npm:express@^4.18.0';
    fs.writeFileSync(denoJsonPath, JSON.stringify(denoJson, null, 2));

    await promiseSpawn(denoCmd, [...denoArgs, 'install'], { cwd: context.dir });
    await promiseSpawn('git', ['add', '--all'], { cwd: context.dir });
    await promiseSpawn('git', ['commit', '-m', 'add express'], { cwd: context.dir });

    await promiseSpawn('git', ['checkout', mainBranch], { cwd: context.dir });

    // Add a different package
    const denoJsonMain = JSON.parse(fs.readFileSync(denoJsonPath, 'utf8'));

    denoJsonMain.imports.uuid = 'npm:uuid@^9.0.0';
    fs.writeFileSync(denoJsonPath, JSON.stringify(denoJsonMain, null, 2));

    await promiseSpawn(denoCmd, [...denoArgs, 'install'], { cwd: context.dir });
    await promiseSpawn('git', ['add', '--all'], { cwd: context.dir });
    await promiseSpawn('git', ['commit', '-m', 'add uuid'], { cwd: context.dir });

    const mergeResult = await promiseSpawn('git', ['merge', '--no-edit', 'deno-test'], {
      cwd: context.dir,
      ignoreExitCode: true,
    });

    expect(mergeResult.stdout).toMatch(/deno\.lock merged successfully/);

    // Resolve deno.json conflict by merging the imports manually
    const currentResult = await promiseSpawn('git', ['show', ':2:deno.json'], { cwd: context.dir });
    const incomingResult = await promiseSpawn('git', ['show', ':3:deno.json'], { cwd: context.dir });

    const currentDenoJson = JSON.parse(currentResult.stdout);
    const incomingDenoJson = JSON.parse(incomingResult.stdout);

    const mergedDenoJson = {
      imports: {
        ...currentDenoJson.imports,
        ...incomingDenoJson.imports,
      },
    };

    fs.writeFileSync(denoJsonPath, JSON.stringify(mergedDenoJson, null, 2));
    await promiseSpawn('git', ['add', 'deno.json'], { cwd: context.dir });
    await promiseSpawn('git', ['commit', '--no-edit'], { cwd: context.dir });

    const lsResult = await promiseSpawn('git', ['ls-files', '-u'], { cwd: context.dir });

    expect(lsResult.stdout.toString().trim()).toBe('');
  });

  test('can automatically resolve package.json conflicts', async () => {
    // Enable package.json conflict resolution for this test
    await promiseSpawn('npx', ['--no-install', 'npm-merge-driver-install', '--resolve-package-json'], {
      cwd: context.dir,
    });

    const branchResult = await promiseSpawn('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: context.dir });
    const mainBranch = branchResult.stdout.toString().trim();

    // Create a scenario where package.json will have a REAL conflict
    // (both branches modify the same section - dependencies)
    await promiseSpawn('git', ['checkout', '-b', 'package-json-test'], { cwd: context.dir });

    // On the test branch, add lodash to dependencies
    const packageJsonPath = path.join(context.dir, 'package.json');
    const packageJson1 = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    packageJson1.dependencies = packageJson1.dependencies || {};
    packageJson1.dependencies.lodash = '^4.17.21';
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson1, null, 2));

    await promiseSpawn('npm', ['i', '--package-lock-only'], { cwd: context.dir });
    await promiseSpawn('git', ['add', '--all'], { cwd: context.dir });
    await promiseSpawn('git', ['commit', '-m', 'add lodash'], { cwd: context.dir });

    // On main branch, add axios to dependencies (same section - this will conflict!)
    await promiseSpawn('git', ['checkout', mainBranch], { cwd: context.dir });

    const packageJson2 = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    packageJson2.dependencies = packageJson2.dependencies || {};
    packageJson2.dependencies.axios = '^1.6.0';
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson2, null, 2));

    await promiseSpawn('npm', ['i', '--package-lock-only'], { cwd: context.dir });
    await promiseSpawn('git', ['add', '--all'], { cwd: context.dir });
    await promiseSpawn('git', ['commit', '-m', 'add axios'], { cwd: context.dir });

    // Merge should succeed and automatically resolve package.json with 'ours' strategy
    const mergeResult = await promiseSpawn('git', ['merge', '--no-edit', 'package-json-test'], {
      cwd: context.dir,
    });

    // Verify the merge succeeded
    expect(mergeResult.stdout).toMatch(/package-lock.json merged successfully/);
    expect(mergeResult.stdout).toMatch(/package.json conflicts resolved successfully/);
    expect(mergeResult.exitCode).toBe(0);

    // Verify package.json was auto-resolved
    // With 'ours' strategy, parse-conflict-json does a deep merge favoring 'ours' values
    // Both dependencies should be present since they're different keys
    const finalPackageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    expect(finalPackageJson.dependencies).toHaveProperty('axios');
    expect(finalPackageJson.dependencies).toHaveProperty('lodash');

    // Verify no unresolved conflicts
    const lsResult = await promiseSpawn('git', ['ls-files', '-u'], { cwd: context.dir });
    expect(lsResult.stdout.toString().trim()).toBe('');
  });
});
