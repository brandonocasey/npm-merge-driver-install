const path = require("node:path");
const spawnPromise = require("@brandonocasey/spawn-promise");
const fs = require("node:fs/promises");
const fsSync = require("node:fs");
const installLocalBin = require.resolve("install-local/bin/install-local");
const isInstalled = require("../src/is-installed.js");
const os = require("node:os");

const BASE_DIR = path.resolve(__dirname, "..");
const TEMP_DIR = os.tmpdir();

let uuidPromise;

const getTempDir = async () => {
  if (!uuidPromise) {
    uuidPromise = import("uuid");
  }
  const uuid = await uuidPromise;

  return path.join(TEMP_DIR, uuid.v4());
};

const promiseSpawn = (bin, args, options = {}) => {
  const ignoreExitCode = options.ignoreExitCode;

  options.ignoreExitCode = undefined;
  options = { stdio: "pipe", encoding: "utf8", ...options };
  options.env = options.env || {};
  options.env.PATH = options.env.PATH || process.env.PATH;

  return spawnPromise(bin, args, options).then(({ status, stderr, stdout, combined }) => {
    if (!ignoreExitCode && status !== 0) {
      return Promise.reject(`command ${bin} ${args.join(" ")} failed with code ${status}\n${combined}`);
    }
    return Promise.resolve({ exitCode: status, stderr, stdout });
  });
};

const sharedHooks = {
  before: async (t) => {
    t.context = {
      template: await getTempDir(),
    };

    await fs.mkdir(t.context.template, { recursive: true });
    await fs.writeFile(path.join(t.context.template, ".gitignore"), "node_modules\n");

    // create the package.json
    return promiseSpawn("npm", ["init", "-y"], { cwd: t.context.template })
      .then((_result) => {
        // create the .git dir
        return promiseSpawn("git", ["init"], { cwd: t.context.template });
      })
      .then((_result) => promiseSpawn("npm", ["install", "--package-lock-only"]))
      .then((_result) => promiseSpawn("git", ["add", "--all"], { cwd: t.context.template }))
      .then((_result) =>
        promiseSpawn("git", ["config", "--local", "user.email", '"you@example.com"'], { cwd: t.context.template }),
      )
      .then((_result) =>
        promiseSpawn("git", ["config", "--local", "user.name", '"Your Name"'], { cwd: t.context.template }),
      )
      .then((_result) => promiseSpawn("git", ["commit", "-a", "-m", '"initial"'], { cwd: t.context.template }));
  },
  beforeEach: async (t) => {
    t.context.old = {
      PATH: process.env.PATH,
    };
    t.context.logs = [];
    t.context.fakeLogger = {
      log: (...args) => {
        t.context.logs.push.apply(t.context.logs, args);
      },
    };

    t.context.dir = await getTempDir();

    // Copy template directory recursively
    const copyRecursive = async (src, dest) => {
      const stats = await fs.stat(src);

      if (stats.isDirectory()) {
        await fs.mkdir(dest, { recursive: true });
        const entries = await fs.readdir(src);

        for (const entry of entries) {
          await copyRecursive(path.join(src, entry), path.join(dest, entry));
        }
      } else {
        await fs.copyFile(src, dest);
      }
    };

    await copyRecursive(t.context.template, t.context.dir);

    t.context.installPackage = (env = {}) =>
      promiseSpawn("node", [installLocalBin, BASE_DIR], { cwd: t.context.dir, env });

    t.context.fakegit = () => {
      // put the tempdir path as highest priorty in PATH
      let separator = ":";
      let gitDest = path.join(t.context.dir, "git");

      if (os.platform() === "win32") {
        separator = ";";
        gitDest += ".exe";
      }

      // move a fake git binary into the temp context dir
      // this will cause git to fail to run
      fsSync.copyFileSync(path.join(__dirname, "fakegit.js"), gitDest);

      return { ...process.env, PATH: `${t.context.dir}${separator}${process.env.PATH}` };
    };
  },

  afterEach: (t) => {
    if (t.context.dir && fsSync.existsSync(t.context.dir)) {
      fsSync.rmSync(t.context.dir, { recursive: true, force: true });
    }
    process.env.PATH = t.context.old.PATH;
  },

  after: (t) => {
    if (t.context.template && fsSync.existsSync(t.context.template)) {
      fsSync.rmSync(t.context.template, { recursive: true, force: true });
    }
  },
};

module.exports = {
  BASE_DIR,
  promiseSpawn,
  isInstalled,
  getTempDir,
  sharedHooks,
};
