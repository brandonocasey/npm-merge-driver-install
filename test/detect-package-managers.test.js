import fs from 'node:fs';
import path from 'node:path';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from 'vitest';
import detectPackageManagers from '../src/detect-package-managers.js';
import { sharedHooks } from './helpers.js';

// biome-ignore lint/security/noSecrets: function name is not a secret
describe('detectPackageManagers', () => {
  const context = {};

  const cleanLockfiles = () => {
    const lockfiles = [
      'package-lock.json',
      'npm-shrinkwrap.json',
      'pnpm-lock.yaml',
      'yarn.lock',
      'bun.lock',
      'bun.lockb',
      'deno.lock',
    ];

    for (const lockfile of lockfiles) {
      const lockfilePath = path.join(context.dir, lockfile);

      if (fs.existsSync(lockfilePath)) {
        fs.unlinkSync(lockfilePath);
      }
    }
  };

  beforeAll(async () => {
    await sharedHooks.before(context);
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

  test('detects npm lockfile', () => {
    const lockfilePath = path.join(context.dir, 'package-lock.json');

    fs.writeFileSync(lockfilePath, '{}');

    const detected = detectPackageManagers(context.dir);

    expect(detected.length).toBe(1);
    expect(detected[0].name).toBe('npm');
    expect(detected[0].lockfile).toBe('package-lock.json');
  });

  test('detects pnpm lockfile', () => {
    cleanLockfiles();

    const lockfilePath = path.join(context.dir, 'pnpm-lock.yaml');

    // biome-ignore lint/security/noSecrets: test data is not a secret
    fs.writeFileSync(lockfilePath, "lockfileVersion: '6.0'");

    const detected = detectPackageManagers(context.dir);

    expect(detected.length).toBe(1);
    expect(detected[0].name).toBe('pnpm');
    expect(detected[0].lockfile).toBe('pnpm-lock.yaml');
  });

  test('detects yarn classic lockfile', () => {
    cleanLockfiles();
    const yarnLockContent = `# yarn lockfile v1

package-name@^1.0.0:
  version "1.0.0"
`;
    const lockfilePath = path.join(context.dir, 'yarn.lock');

    fs.writeFileSync(lockfilePath, yarnLockContent);

    const detected = detectPackageManagers(context.dir);

    expect(detected.length).toBe(1);
    expect(detected[0].name).toBe('yarn-classic');
    expect(detected[0].lockfile).toBe('yarn.lock');
  });

  test('detects yarn berry lockfile', () => {
    cleanLockfiles();
    const yarnLockContent = `__metadata:
  version: 8

"package-name@npm:^1.0.0":
  version: 1.0.0
`;
    const lockfilePath = path.join(context.dir, 'yarn.lock');

    fs.writeFileSync(lockfilePath, yarnLockContent);

    const detected = detectPackageManagers(context.dir);

    expect(detected.length).toBe(1);
    expect(detected[0].name).toBe('yarn-berry');
    expect(detected[0].lockfile).toBe('yarn.lock');
  });

  test('detects bun lockfile', () => {
    cleanLockfiles();
    const lockfilePath = path.join(context.dir, 'bun.lock');

    fs.writeFileSync(lockfilePath, '');

    const detected = detectPackageManagers(context.dir);

    expect(detected.length).toBe(1);
    expect(detected[0].name).toBe('bun');
    expect(detected[0].lockfile).toBe('bun.lock');
  });

  test('detects deno lockfile', () => {
    cleanLockfiles();
    const lockfilePath = path.join(context.dir, 'deno.lock');

    fs.writeFileSync(lockfilePath, '{}');

    const detected = detectPackageManagers(context.dir);

    expect(detected.length).toBe(1);
    expect(detected[0].name).toBe('deno');
    expect(detected[0].lockfile).toBe('deno.lock');
  });

  test('detects multiple package managers', () => {
    cleanLockfiles();
    fs.writeFileSync(path.join(context.dir, 'package-lock.json'), '{}');
    // biome-ignore lint/security/noSecrets: test data is not a secret
    fs.writeFileSync(path.join(context.dir, 'pnpm-lock.yaml'), "lockfileVersion: '6.0'");

    const detected = detectPackageManagers(context.dir);

    expect(detected.length).toBe(2);
    const names = detected.map((pm) => pm.name).sort();

    expect(names).toEqual(['npm', 'pnpm']);
  });

  test('returns empty array when no lockfiles present', () => {
    cleanLockfiles();
    const detected = detectPackageManagers(context.dir);

    expect(detected.length).toBe(0);
  });

  test('handles both bun.lock and bun.lockb without duplication', () => {
    cleanLockfiles();
    fs.writeFileSync(path.join(context.dir, 'bun.lock'), '');
    fs.writeFileSync(path.join(context.dir, 'bun.lockb'), '');

    const detected = detectPackageManagers(context.dir);

    expect(detected.length).toBe(1);
    expect(detected[0].name).toBe('bun');
  });
});
