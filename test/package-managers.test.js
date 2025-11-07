const test = require("ava");
const { packageManagers, getPackageManagerByLockfile, getAllLockfilePatterns } = require("../src/package-managers.js");

test("packageManagers registry contains expected package managers", (t) => {
  t.truthy(packageManagers.npm);
  t.truthy(packageManagers.pnpm);
  t.truthy(packageManagers["yarn-classic"]);
  t.truthy(packageManagers["yarn-berry"]);
  t.truthy(packageManagers.bun);
  t.truthy(packageManagers.deno);
});

test("npm package manager has correct configuration", (t) => {
  const npm = packageManagers.npm;

  t.is(npm.name, "npm");
  t.deepEqual(npm.lockfiles, ["package-lock.json", "npm-shrinkwrap.json"]);
  t.is(npm.supportsTextMerge, true);
  t.truthy(npm.getExecutable);
  t.truthy(npm.getMergeArgs);
});

test("pnpm package manager has correct configuration", (t) => {
  const pnpm = packageManagers.pnpm;

  t.is(pnpm.name, "pnpm");
  t.deepEqual(pnpm.lockfiles, ["pnpm-lock.yaml"]);
  t.is(pnpm.supportsTextMerge, true);
});

test("bun package manager has correct configuration", (t) => {
  const bun = packageManagers.bun;

  t.is(bun.name, "bun");
  t.deepEqual(bun.lockfiles, ["bun.lock", "bun.lockb"]);
  t.is(typeof bun.supportsTextMerge, "function");
});

test("getPackageManagerByLockfile returns correct package manager for npm", (t) => {
  const pm = getPackageManagerByLockfile("package-lock.json");

  t.is(pm.name, "npm");
});

test("getPackageManagerByLockfile returns correct package manager for pnpm", (t) => {
  const pm = getPackageManagerByLockfile("pnpm-lock.yaml");

  t.is(pm.name, "pnpm");
});

test("getPackageManagerByLockfile returns correct package manager for yarn", (t) => {
  const pm = getPackageManagerByLockfile("yarn.lock");

  t.is(pm.name, "yarn-classic");
});

test("getPackageManagerByLockfile returns correct package manager for bun", (t) => {
  const pm = getPackageManagerByLockfile("bun.lock");

  t.is(pm.name, "bun");
});

test("getPackageManagerByLockfile returns correct package manager for deno", (t) => {
  const pm = getPackageManagerByLockfile("deno.lock");

  t.is(pm.name, "deno");
});

test("getPackageManagerByLockfile handles paths with directories", (t) => {
  const pm = getPackageManagerByLockfile("/path/to/package-lock.json");

  t.is(pm.name, "npm");
});

test("getPackageManagerByLockfile returns null for unknown lockfile", (t) => {
  const pm = getPackageManagerByLockfile("unknown.lock");

  t.is(pm, null);
});

test("getAllLockfilePatterns returns all lockfile patterns", (t) => {
  const patterns = getAllLockfilePatterns();

  t.true(patterns.includes("package-lock.json"));
  t.true(patterns.includes("npm-shrinkwrap.json"));
  t.true(patterns.includes("pnpm-lock.yaml"));
  t.true(patterns.includes("yarn.lock"));
  t.true(patterns.includes("bun.lock"));
  t.true(patterns.includes("bun.lockb"));
  t.true(patterns.includes("deno.lock"));
});

test("bun supportsTextMerge function works correctly", (t) => {
  const bun = packageManagers.bun;

  t.true(bun.supportsTextMerge("bun.lock"));
  t.false(bun.supportsTextMerge("bun.lockb"));
});

test("npm getExecutable returns correct value for current platform", (t) => {
  const npm = packageManagers.npm;
  const executable = npm.getExecutable();
  const os = require("node:os");
  const expected = os.platform() === "win32" ? "npm.cmd" : "npm";

  t.is(executable, expected);
});

test("pnpm getExecutable returns correct value for current platform", (t) => {
  const pnpm = packageManagers.pnpm;
  const executable = pnpm.getExecutable();
  const os = require("node:os");
  const expected = os.platform() === "win32" ? "pnpm.cmd" : "pnpm";

  t.is(executable, expected);
});

test("yarn-classic getExecutable returns correct value for current platform", (t) => {
  const yarn = packageManagers["yarn-classic"];
  const executable = yarn.getExecutable();
  const os = require("node:os");
  const expected = os.platform() === "win32" ? "yarn.cmd" : "yarn";

  t.is(executable, expected);
});

test("yarn-berry getExecutable returns correct value for current platform", (t) => {
  const yarn = packageManagers["yarn-berry"];
  const executable = yarn.getExecutable();
  const os = require("node:os");
  const expected = os.platform() === "win32" ? "yarn.cmd" : "yarn";

  t.is(executable, expected);
});

test("bun getExecutable returns correct value for current platform", (t) => {
  const bun = packageManagers.bun;
  const executable = bun.getExecutable();
  const os = require("node:os");
  const expected = os.platform() === "win32" ? "bun.exe" : "bun";

  t.is(executable, expected);
});

test("deno getExecutable returns correct value for current platform", (t) => {
  const deno = packageManagers.deno;
  const executable = deno.getExecutable();
  const os = require("node:os");
  const expected = os.platform() === "win32" ? "deno.exe" : "deno";

  t.is(executable, expected);
});

test("npm getMergeArgs returns correct arguments", (t) => {
  const npm = packageManagers.npm;
  const args = npm.getMergeArgs();

  t.deepEqual(args, ["install", "--package-lock-only", "--prefer-offline", "--no-audit", "--progress=false"]);
});

test("pnpm getMergeArgs returns correct arguments", (t) => {
  const pnpm = packageManagers.pnpm;
  const args = pnpm.getMergeArgs();

  t.deepEqual(args, ["install", "--lockfile-only", "--prefer-offline", "--no-optional"]);
});

test("yarn-classic getMergeArgs returns correct arguments", (t) => {
  const yarn = packageManagers["yarn-classic"];
  const args = yarn.getMergeArgs();

  t.deepEqual(args, ["install", "--frozen-lockfile"]);
});

test("yarn-berry getMergeArgs returns correct arguments", (t) => {
  const yarn = packageManagers["yarn-berry"];
  const args = yarn.getMergeArgs();

  t.deepEqual(args, ["install", "--mode=skip-build"]);
});

test("bun getMergeArgs returns correct arguments", (t) => {
  const bun = packageManagers.bun;
  const args = bun.getMergeArgs();

  t.deepEqual(args, ["install", "--frozen-lockfile"]);
});

test("deno getMergeArgs returns correct arguments", (t) => {
  const deno = packageManagers.deno;
  const args = deno.getMergeArgs();

  t.deepEqual(args, ["cache", "--reload"]);
});

test("getPackageManagerByLockfile handles Windows-style paths", (t) => {
  const pm = getPackageManagerByLockfile("C:\\path\\to\\package-lock.json");

  t.is(pm.name, "npm");
});

test("getPackageManagerByLockfile handles npm-shrinkwrap.json", (t) => {
  const pm = getPackageManagerByLockfile("npm-shrinkwrap.json");

  t.is(pm.name, "npm");
});

test("getPackageManagerByLockfile handles bun.lockb", (t) => {
  const pm = getPackageManagerByLockfile("bun.lockb");

  t.is(pm.name, "bun");
});
