#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { sync: spawnSync } = require("cross-spawn");
const { getGitDir } = require("./get-git-dir.js");
const logger = require("./logger.js");
const RE = /.* merge\s*=\s*npm-merge-driver-install$/;
const RE2 = /.* merge\s*=\s*npm-merge-driver$/;

const uninstall = (cwd, options) => {
  const logger_ = options?.logger || logger;
  const env = options?.env || process.env;
  const proc = options?.process || process;
  const getGitDir_ = options?.getGitDir || getGitDir;
  const workingDir = cwd || env.INIT_CWD || proc.cwd();
  const gitDir = getGitDir_(workingDir, options);

  if (gitDir) {
    // remove git config settings
    spawnSync("git", ["config", "--local", "--remove-section", "merge.npm-merge-driver-install"], {
      cwd: workingDir,
      env,
    });

    spawnSync("git", ["config", "--local", "--remove-section", "merge.npm-merge-driver"], {
      cwd: workingDir,
      env,
    });

    const attrFile = path.join(gitDir, "info", "attributes");

    // remove git attributes
    if (fs.existsSync(attrFile)) {
      let attrContents = "";

      try {
        attrContents = fs
          .readFileSync(attrFile, "utf8")
          .split(/\r?\n/)
          .filter((line) => !(line.match(RE) || line.match(RE2)))
          .join("\n");
      } catch (_e) {
        // some issue we cannot handle
      }

      fs.writeFileSync(attrFile, attrContents);
    }
  }

  logger_.log("uninstalled successfully");

  return 0;
};

module.exports = uninstall;

// The code below will only run when working as an executable
// that way we can test the cli using require in unit tests.
if (require.main === module) {
  const exitCode = uninstall();

  process.exit(exitCode);
}
