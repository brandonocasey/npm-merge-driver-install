#!/usr/bin/env node

const { getGitDir } = require("./get-git-dir.js");
const path = require("node:path");
const fs = require("node:fs");

const inConfig = (gitDir) => {
  const gitConfigPath = path.join(gitDir, "config");

  if (!fs.existsSync(gitConfigPath)) {
    return false;
  }

  const config = fs.readFileSync(gitConfigPath, "utf8");

  return /npm-merge-driver-install/i.test(config);
};

const inAttr = (gitDir) => {
  const gitAttrPath = path.join(gitDir, "info", "attributes");

  if (!fs.existsSync(gitAttrPath)) {
    return false;
  }

  const attr = fs.readFileSync(gitAttrPath, "utf8");

  return /npm-merge-driver-install/i.test(attr);
};

const isInstalled = (cwd, options) => {
  const env = options?.env || process.env;
  const proc = options?.process || process;
  const getGitDir_ = options?.getGitDir || getGitDir;
  const workingDir = cwd || env.INIT_CWD || proc.cwd();
  const gitDir = getGitDir_(workingDir, options);

  if (!gitDir) {
    return false;
  }

  return inConfig(gitDir) || inAttr(gitDir);
};

module.exports = isInstalled;

// The code below will only run when working as an executable
// that way we can test the cli using require in unit tests.
if (require.main === module) {
  const exitCode = isInstalled() ? 0 : 1;

  process.exit(exitCode);
}
