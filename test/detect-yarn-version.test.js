const test = require("ava");
const path = require("node:path");
const fs = require("node:fs");
const detectYarnVersion = require("../src/detect-yarn-version.js");
const { sharedHooks } = require("./helpers.js");

test.before(sharedHooks.before);
test.beforeEach(sharedHooks.beforeEach);
test.afterEach.always(sharedHooks.afterEach);
test.after.always(sharedHooks.after);

test("detects yarn classic from lockfile header", (t) => {
  const yarnLockContent = `# yarn lockfile v1

package-name@^1.0.0:
  version "1.0.0"
  resolved "https://registry.yarnpkg.com/package-name/-/package-name-1.0.0.tgz"
`;
  const lockfilePath = path.join(t.context.dir, "yarn.lock");

  fs.writeFileSync(lockfilePath, yarnLockContent);

  const version = detectYarnVersion(t.context.dir);

  t.is(version, "classic");
});

test("detects yarn berry from __metadata field", (t) => {
  const yarnLockContent = `__metadata:
  version: 8
  cacheKey: 10c0

"package-name@npm:^1.0.0":
  version: 1.0.0
  resolution: "package-name@npm:1.0.0"
`;
  const lockfilePath = path.join(t.context.dir, "yarn.lock");

  fs.writeFileSync(lockfilePath, yarnLockContent);

  const version = detectYarnVersion(t.context.dir);

  t.is(version, "berry");
});

test("returns null if yarn.lock does not exist", (t) => {
  const version = detectYarnVersion(t.context.dir);

  t.is(version, null);
});

test("returns classic for malformed yarn.lock", (t) => {
  const yarnLockContent = "not a valid yarn lockfile";
  const lockfilePath = path.join(t.context.dir, "yarn.lock");

  fs.writeFileSync(lockfilePath, yarnLockContent);

  const version = detectYarnVersion(t.context.dir);

  t.is(version, "classic");
});
