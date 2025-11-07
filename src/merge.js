#!/usr/bin/env node
/* eslint-disable no-console */

const spawnSync = require("node:child_process").spawnSync;
const path = require("node:path");
const fs = require("node:fs");
const logger = require("./logger.js");
const { packageManagers, getPackageManagerByLockfile } = require("./package-managers.js");
const detectYarnVersion = require("./detect-yarn-version.js");
const getRoot = require("./get-root.js");

const currentVersion = process.argv[2];
const ancestorVersion = process.argv[3];
const otherVersion = process.argv[4];
const file = process.argv[5];

const rootDir = getRoot(process.cwd());

if (!rootDir) {
  logger.log("ERROR: Could not find git repository root");
  process.exit(1);
}

const resolvedFile = path.resolve(file);
const resolvedRoot = path.resolve(rootDir);

if (!resolvedFile.startsWith(resolvedRoot)) {
  logger.log(`ERROR: ${file} is outside repository bounds`);
  process.exit(1);
}

let pm = getPackageManagerByLockfile(file);

if (!pm) {
  logger.log(`ERROR: ${file} is not a recognized lockfile`);
  process.exit(1);
}

if (file.endsWith("yarn.lock")) {
  const yarnVersion = detectYarnVersion(path.dirname(file));
  const pmKey = yarnVersion === "berry" ? "yarn-berry" : "yarn-classic";

  pm = packageManagers[pmKey];
}

const supportsTextMerge =
  typeof pm.supportsTextMerge === "function" ? pm.supportsTextMerge(file) : pm.supportsTextMerge;

if (supportsTextMerge) {
  logger.log(`attempting text-based merge for ${file}`);
  const ret = spawnSync("git", ["merge-file", "-p", currentVersion, ancestorVersion, otherVersion], {
    stdio: [0, "pipe", 2],
  });

  if (ret.status !== 0) {
    logger.log("text-based merge had conflicts, relying on package manager to regenerate");
  }

  try {
    fs.writeFileSync(file, ret.stdout);
  } catch (error) {
    logger.log(`ERROR: Failed to write merged content to ${file}: ${error.message}`);
    process.exit(1);
  }
} else {
  logger.log(`${file} is binary format, skipping text-based merge`);
}

const executable = pm.getExecutable();
const args = pm.getMergeArgs();

logger.log(`running ${executable} ${args.join(" ")} to resolve lockfile`);
const install = spawnSync(executable, args, { cwd: path.dirname(file) });

if (install.status !== 0) {
  logger.log(`ERROR: Failed to merge ${file}`);
  logger.log(`ACTION REQUIRED: Resolve package.json conflicts, then run: ${executable} ${args.join(" ")}`);
  console.log();
  process.exit(1);
}

try {
  const mergedContent = fs.readFileSync(file);

  fs.writeFileSync(currentVersion, mergedContent);
} catch (error) {
  logger.log(`ERROR: Failed to finalize merge for ${file}: ${error.message}`);
  process.exit(1);
}

logger.log(`${file} merged successfully`);
