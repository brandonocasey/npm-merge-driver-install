const { sync: spawnSync } = require("cross-spawn");

const resolveGitPath = (rootDir, args, options) => {
  if (!rootDir) {
    return "";
  }

  const env = options?.env || process.env;
  const { status, stdout } = spawnSync("git", args, { cwd: rootDir, env, encoding: "utf8" });

  return status === 0 ? stdout.trim() : "";
};

const getGitDir = (rootDir, options) =>
  resolveGitPath(rootDir, ["rev-parse", "--path-format=absolute", "--git-common-dir"], options);

const getGitCommonDir = (rootDir, options) => getGitDir(rootDir, options);

module.exports = { getGitDir, getGitCommonDir };
