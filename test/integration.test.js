const test = require("ava");
const path = require("node:path");
const { promiseSpawn, sharedHooks } = require("./helpers.js");

test.before(sharedHooks.before);
test.beforeEach(async (t) => {
  await sharedHooks.beforeEach(t);

  const npmCacheDir = path.join(t.context.dir, ".npm-cache");

  return t.context
    .installPackage({ npm_config_cache: npmCacheDir })
    .then(() => promiseSpawn("npx", ["--no-install", "npm-merge-driver-install"], { cwd: t.context.dir }))
    .then((_result) =>
      promiseSpawn("npm", ["i", "--package-lock-only", "-D", "not-prerelease"], { cwd: t.context.dir }),
    )
    .then((_result) => promiseSpawn("git", ["add", "--all"], { cwd: t.context.dir }))
    .then((_result) =>
      promiseSpawn("git", ["commit", "-a", "-m", '"add not-prerelease to dev deps"'], { cwd: t.context.dir }),
    );
});
test.afterEach.always(sharedHooks.afterEach);
test.after.always(sharedHooks.after);

test("can merge package-lock only changes", (t) => {
  let mainBranch;

  return promiseSpawn("git", ["rev-parse", "--abbrev-ref", "HEAD"], { cwd: t.context.dir })
    .then((result) => {
      mainBranch = result.stdout.toString().trim();

      return promiseSpawn("git", ["checkout", "-b", "merge-driver-test"], { cwd: t.context.dir });
    })
    .then((_result) => promiseSpawn("npm", ["i", "--package-lock-only", "-D", "express"], { cwd: t.context.dir }))
    .then((_result) => promiseSpawn("git", ["add", "--all"], { cwd: t.context.dir }))
    .then((_result) => promiseSpawn("git", ["commit", "-a", "-m", '"add express to dev deps"'], { cwd: t.context.dir }))
    .then((_result) => promiseSpawn("git", ["checkout", mainBranch], { cwd: t.context.dir }))
    .then((_result) => promiseSpawn("npm", ["i", "--package-lock-only", "express"], { cwd: t.context.dir }))
    .then((_result) => promiseSpawn("git", ["add", "--all"], { cwd: t.context.dir }))
    .then((_result) => promiseSpawn("git", ["commit", "-a", "-m", '"add express as dep"'], { cwd: t.context.dir }))
    .then((_result) => promiseSpawn("git", ["merge", "--no-edit", "merge-driver-test"], { cwd: t.context.dir }))
    .then((result) => {
      t.regex(result.stdout, /npm-merge-driver-install: package-lock.json merged successfully/, "merge happened");
      return promiseSpawn("git", ["ls-files", "-u"], { cwd: t.context.dir });
    })
    .then((_result) => {
      // if we get nothing back from ls-files
      // everything was merged!
      t.falsy(t.stdout);
      t.falsy(t.stderr);
    });
});

test("installs git attributes for all package managers", (t) => {
  const path = require("node:path");
  const fs = require("node:fs");
  const { getGitDir } = require("../src/get-git-dir.js");

  const gitDir = getGitDir(t.context.dir);
  const attrFile = path.join(gitDir, "info", "attributes");

  t.true(fs.existsSync(attrFile), "attributes file exists");

  const content = fs.readFileSync(attrFile, "utf8");

  t.regex(content, /package-lock\.json merge=npm-merge-driver-install/, "npm lockfile registered");
  t.regex(content, /npm-shrinkwrap\.json merge=npm-merge-driver-install/, "npm shrinkwrap registered");
  t.regex(content, /pnpm-lock\.yaml merge=npm-merge-driver-install/, "pnpm lockfile registered");
  t.regex(content, /yarn\.lock merge=npm-merge-driver-install/, "yarn lockfile registered");
  t.regex(content, /bun\.lock merge=npm-merge-driver-install/, "bun text lockfile registered");
  t.regex(content, /bun\.lockb merge=npm-merge-driver-install/, "bun binary lockfile registered");
  t.regex(content, /deno\.lock merge=npm-merge-driver-install/, "deno lockfile registered");
});

test("configures git merge driver", async (t) => {
  const result = await promiseSpawn("git", ["config", "--local", "--get", "merge.npm-merge-driver-install.driver"], {
    cwd: t.context.dir,
  });

  t.regex(result.stdout, /node.*merge\.js/, "merge driver configured");
});

test("can merge pnpm-lock.yaml changes", async (t) => {
  const fs = require("node:fs");
  const path = require("node:path");

  try {
    await promiseSpawn("pnpm", ["--version"], { cwd: t.context.dir });
  } catch (_error) {
    t.fail("pnpm binary not available; run npm install first");
    return;
  }

  let mainBranch;

  const packageJsonPath = path.join(t.context.dir, "package.json");
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

  delete packageJson.dependencies;
  packageJson.devDependencies = { "not-prerelease": "^1.0.0" };
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

  await promiseSpawn("pnpm", ["install", "--no-frozen-lockfile"], { cwd: t.context.dir });
  await promiseSpawn("git", ["add", "--all"], { cwd: t.context.dir });
  await promiseSpawn("git", ["commit", "-m", "switch to pnpm"], { cwd: t.context.dir });

  const result = await promiseSpawn("git", ["rev-parse", "--abbrev-ref", "HEAD"], { cwd: t.context.dir });

  mainBranch = result.stdout.toString().trim();

  await promiseSpawn("git", ["checkout", "-b", "pnpm-test"], { cwd: t.context.dir });

  await promiseSpawn("pnpm", ["add", "-D", "express"], { cwd: t.context.dir });
  await promiseSpawn("git", ["add", "--all"], { cwd: t.context.dir });
  await promiseSpawn("git", ["commit", "-m", "add express to devDeps"], { cwd: t.context.dir });

  await promiseSpawn("git", ["checkout", mainBranch], { cwd: t.context.dir });

  await promiseSpawn("pnpm", ["add", "express"], { cwd: t.context.dir });
  await promiseSpawn("git", ["add", "--all"], { cwd: t.context.dir });
  await promiseSpawn("git", ["commit", "-m", "add express to deps"], { cwd: t.context.dir });

  const mergeResult = await promiseSpawn("git", ["merge", "--no-edit", "pnpm-test"], { cwd: t.context.dir });

  t.regex(mergeResult.stdout, /pnpm-lock\.yaml merged successfully/, "pnpm merge happened");

  const lsResult = await promiseSpawn("git", ["ls-files", "-u"], { cwd: t.context.dir });

  t.is(lsResult.stdout.toString().trim(), "", "no unmerged files");
});

test("can merge yarn.lock changes", async (t) => {
  const fs = require("node:fs");
  const path = require("node:path");

  try {
    await promiseSpawn("yarn", ["--version"], { cwd: t.context.dir });
  } catch (_error) {
    t.fail("yarn binary not available; run npm install first");
    return;
  }

  let mainBranch;

  const packageJsonPath = path.join(t.context.dir, "package.json");
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

  delete packageJson.dependencies;
  packageJson.devDependencies = { "not-prerelease": "^1.0.0" };
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

  await promiseSpawn("yarn", ["install"], { cwd: t.context.dir });
  await promiseSpawn("git", ["add", "--all"], { cwd: t.context.dir });
  await promiseSpawn("git", ["commit", "-m", "switch to yarn"], { cwd: t.context.dir });

  const result = await promiseSpawn("git", ["rev-parse", "--abbrev-ref", "HEAD"], { cwd: t.context.dir });

  mainBranch = result.stdout.toString().trim();

  await promiseSpawn("git", ["checkout", "-b", "yarn-test"], { cwd: t.context.dir });

  await promiseSpawn("yarn", ["add", "-D", "express"], { cwd: t.context.dir });
  await promiseSpawn("git", ["add", "--all"], { cwd: t.context.dir });
  await promiseSpawn("git", ["commit", "-m", "add express to devDeps"], { cwd: t.context.dir });

  await promiseSpawn("git", ["checkout", mainBranch], { cwd: t.context.dir });

  await promiseSpawn("yarn", ["add", "express"], { cwd: t.context.dir });
  await promiseSpawn("git", ["add", "--all"], { cwd: t.context.dir });
  await promiseSpawn("git", ["commit", "-m", "add express to deps"], { cwd: t.context.dir });

  const mergeResult = await promiseSpawn("git", ["merge", "--no-edit", "yarn-test"], { cwd: t.context.dir });

  t.regex(mergeResult.stdout, /yarn\.lock merged successfully/, "yarn merge happened");

  const lsResult = await promiseSpawn("git", ["ls-files", "-u"], { cwd: t.context.dir });

  t.is(lsResult.stdout.toString().trim(), "", "no unmerged files");
});
