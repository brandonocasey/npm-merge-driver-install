const test = require("ava");
const path = require("node:path");
const fs = require("node:fs");
const detectPackageManagers = require("../src/detect-package-managers.js");
const { sharedHooks } = require("./helpers.js");

test.before(sharedHooks.before);
test.beforeEach(sharedHooks.beforeEach);
test.afterEach.always(sharedHooks.afterEach);
test.after.always(sharedHooks.after);

test("detects npm lockfile", (t) => {
  const lockfilePath = path.join(t.context.dir, "package-lock.json");

  fs.writeFileSync(lockfilePath, "{}");

  const detected = detectPackageManagers(t.context.dir);

  t.is(detected.length, 1);
  t.is(detected[0].name, "npm");
  t.is(detected[0].lockfile, "package-lock.json");
});

test("detects pnpm lockfile", (t) => {
  const lockfilePath = path.join(t.context.dir, "pnpm-lock.yaml");

  fs.writeFileSync(lockfilePath, "lockfileVersion: '6.0'");

  const detected = detectPackageManagers(t.context.dir);

  t.is(detected.length, 1);
  t.is(detected[0].name, "pnpm");
  t.is(detected[0].lockfile, "pnpm-lock.yaml");
});

test("detects yarn classic lockfile", (t) => {
  const yarnLockContent = `# yarn lockfile v1

package-name@^1.0.0:
  version "1.0.0"
`;
  const lockfilePath = path.join(t.context.dir, "yarn.lock");

  fs.writeFileSync(lockfilePath, yarnLockContent);

  const detected = detectPackageManagers(t.context.dir);

  t.is(detected.length, 1);
  t.is(detected[0].name, "yarn-classic");
  t.is(detected[0].lockfile, "yarn.lock");
});

test("detects yarn berry lockfile", (t) => {
  const yarnLockContent = `__metadata:
  version: 8

"package-name@npm:^1.0.0":
  version: 1.0.0
`;
  const lockfilePath = path.join(t.context.dir, "yarn.lock");

  fs.writeFileSync(lockfilePath, yarnLockContent);

  const detected = detectPackageManagers(t.context.dir);

  t.is(detected.length, 1);
  t.is(detected[0].name, "yarn-berry");
  t.is(detected[0].lockfile, "yarn.lock");
});

test("detects bun lockfile", (t) => {
  const lockfilePath = path.join(t.context.dir, "bun.lock");

  fs.writeFileSync(lockfilePath, "");

  const detected = detectPackageManagers(t.context.dir);

  t.is(detected.length, 1);
  t.is(detected[0].name, "bun");
  t.is(detected[0].lockfile, "bun.lock");
});

test("detects deno lockfile", (t) => {
  const lockfilePath = path.join(t.context.dir, "deno.lock");

  fs.writeFileSync(lockfilePath, "{}");

  const detected = detectPackageManagers(t.context.dir);

  t.is(detected.length, 1);
  t.is(detected[0].name, "deno");
  t.is(detected[0].lockfile, "deno.lock");
});

test("detects multiple package managers", (t) => {
  fs.writeFileSync(path.join(t.context.dir, "package-lock.json"), "{}");
  fs.writeFileSync(path.join(t.context.dir, "pnpm-lock.yaml"), "lockfileVersion: '6.0'");

  const detected = detectPackageManagers(t.context.dir);

  t.is(detected.length, 2);
  const names = detected.map((pm) => pm.name).sort();

  t.deepEqual(names, ["npm", "pnpm"]);
});

test("returns empty array when no lockfiles present", (t) => {
  const detected = detectPackageManagers(t.context.dir);

  t.is(detected.length, 0);
});

test("handles both bun.lock and bun.lockb without duplication", (t) => {
  fs.writeFileSync(path.join(t.context.dir, "bun.lock"), "");
  fs.writeFileSync(path.join(t.context.dir, "bun.lockb"), "");

  const detected = detectPackageManagers(t.context.dir);

  t.is(detected.length, 1);
  t.is(detected[0].name, "bun");
});
