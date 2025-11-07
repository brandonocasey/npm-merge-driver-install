import fs from 'node:fs';
import path from 'node:path';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from 'vitest';
import detectYarnVersion from '../src/detect-yarn-version.js';
import { sharedHooks } from './helpers.js';

describe('detectYarnVersion', () => {
  const context = {};

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

  test('detects yarn classic from lockfile header', () => {
    const yarnLockContent = `# yarn lockfile v1

package-name@^1.0.0:
  version "1.0.0"
  resolved "https://registry.yarnpkg.com/package-name/-/package-name-1.0.0.tgz"
`;
    const lockfilePath = path.join(context.dir, 'yarn.lock');

    fs.writeFileSync(lockfilePath, yarnLockContent);

    const version = detectYarnVersion(context.dir);

    expect(version).toBe('classic');
  });

  test('detects yarn berry from __metadata field', () => {
    const yarnLockContent = `__metadata:
  version: 8
  cacheKey: 10c0

"package-name@npm:^1.0.0":
  version: 1.0.0
  resolution: "package-name@npm:1.0.0"
`;
    const lockfilePath = path.join(context.dir, 'yarn.lock');

    fs.writeFileSync(lockfilePath, yarnLockContent);

    const version = detectYarnVersion(context.dir);

    expect(version).toBe('berry');
  });

  test('returns null if yarn.lock does not exist', () => {
    const version = detectYarnVersion(context.dir);

    expect(version).toBe(null);
  });

  test('returns classic for malformed yarn.lock', () => {
    const yarnLockContent = 'not a valid yarn lockfile';
    const lockfilePath = path.join(context.dir, 'yarn.lock');

    fs.writeFileSync(lockfilePath, yarnLockContent);

    const version = detectYarnVersion(context.dir);

    expect(version).toBe('classic');
  });
});
