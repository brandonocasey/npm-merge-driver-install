const path = require('path');
const spawnPromise = require('@brandonocasey/spawn-promise');
const uuid = require('uuid');
const fs = require('fs');
const installLocalBin = require.resolve('install-local/bin/install-local');
const isInstalled = require('../src/is-installed.js');
const os = require('os');

const BASE_DIR = path.resolve(__dirname, '..');
const TEMP_DIR = os.tmpdir();

const getTempDir = function() {
  return path.join(TEMP_DIR, uuid.v4());
};

const promiseSpawn = function(bin, args, options = {}) {
  const ignoreExitCode = options.ignoreExitCode;

  delete options.ignoreExitCode;
  options = Object.assign({stdio: 'pipe', encoding: 'utf8'}, options);
  options.env = options.env || {};
  options.env.PATH = options.env.PATH || process.env.PATH;

  return spawnPromise(bin, args, options).then(function({status, stderr, stdout, combined}) {
    if (!ignoreExitCode && status !== 0) {
      return Promise.reject(`command ${bin} ${args.join(' ')} failed with code ${status}\n` + combined);
    }
    return Promise.resolve({exitCode: status, stderr, stdout});

  });
};

const sharedHooks = {

  before: (t) => {
    t.context = {
      template: getTempDir()
    };

    fs.mkdirSync(t.context.template, {recursive: true});
    fs.writeFileSync(path.join(t.context.template, '.gitignore'), 'node_modules\n');

    // create the package.json
    return promiseSpawn('npm', ['init', '-y'], {cwd: t.context.template}).then(function(result) {
      // create the .git dir
      return promiseSpawn('git', ['init'], {cwd: t.context.template});
    }).then(function(result) {
      return promiseSpawn('npm', ['install', '--package-lock-only']);
    }).then(function(result) {
      return promiseSpawn('git', ['add', '--all'], {cwd: t.context.template});
    }).then(function(result) {
      return promiseSpawn('git', ['config', '--local', 'user.email', '"you@example.com"'], {cwd: t.context.template});
    }).then(function(result) {
      return promiseSpawn('git', ['config', '--local', 'user.name', '"Your Name"'], {cwd: t.context.template});
    }).then(function(result) {
      return promiseSpawn('git', ['commit', '-a', '-m', '"initial"'], {cwd: t.context.template});
    });
  },
  beforeEach: (t) => {
    t.context.old = {
      PATH: process.env.PATH
    };
    t.context.logs = [];
    t.context.fakeLogger = {
      log: (...args) => {
        t.context.logs.push.apply(t.context.logs, args);
      }
    };

    t.context.dir = getTempDir();

    // Copy template directory recursively
    const copyRecursive = (src, dest) => {
      const stats = fs.statSync(src);

      if (stats.isDirectory()) {
        fs.mkdirSync(dest, {recursive: true});
        const entries = fs.readdirSync(src);

        for (const entry of entries) {
          copyRecursive(path.join(src, entry), path.join(dest, entry));
        }
      } else {
        fs.copyFileSync(src, dest);
      }
    };

    copyRecursive(t.context.template, t.context.dir);

    t.context.installPackage = function(env = {}) {
      return promiseSpawn('node', [installLocalBin, BASE_DIR], {cwd: t.context.dir, env});
    };

    t.context.fakegit = function() {
      // put the tempdir path as highest priorty in PATH
      let separator = ':';
      let gitDest = path.join(t.context.dir, 'git');

      if (os.platform() === 'win32') {
        separator = ';';
        gitDest += '.exe';
      }

      // move a fake git binary into the temp context dir
      // this will cause git to fail to run
      fs.copyFileSync(path.join(__dirname, 'fakegit.js'), gitDest);

      return Object.assign({}, process.env, {
        PATH: `${t.context.dir}${separator}${process.env.PATH}`
      });
    };

  },

  afterEach: (t) => {
    if (t.context.dir && fs.existsSync(t.context.dir)) {
      fs.rmSync(t.context.dir, {recursive: true, force: true});
    }
    process.env.PATH = t.context.old.PATH;
  },

  after: (t) => {
    if (t.context.template && fs.existsSync(t.context.template)) {
      fs.rmSync(t.context.template, {recursive: true, force: true});
    }
  }
};

module.exports = {
  BASE_DIR,
  promiseSpawn,
  isInstalled,
  getTempDir,
  sharedHooks
};
