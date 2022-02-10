const path = require('path');
const spawnPromise = require('@brandonocasey/spawn-promise');
const shell = require('shelljs');
const uuid = require('uuid');
const fs = require('fs');
const installLocalBin = require.resolve('install-local/bin/install-local');
const isInstalled = require('../src/is-installed.js');
const os = require('os');

const BASE_DIR = path.resolve(__dirname, '..');
const TEMP_DIR = shell.tempdir();

const getTempDir = function() {
  return path.join(TEMP_DIR, uuid.v4());
};

const promiseSpawn = function(bin, args, options = {}) {
  const ignoreExitCode = options.ignoreExitCode;

  delete options.ignoreExitCode;
  options = Object.assign({shell: true, stdio: 'pipe', encoding: 'utf8'}, options);
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

    shell.mkdir(t.context.template);
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
    shell.cp('-R', t.context.template, t.context.dir);

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
      shell.cp(path.join(__dirname, 'fakegit.js'), gitDest);

      return Object.assign({}, process.env, {
        PATH: `${t.context.dir}${separator}${process.env.PATH}`
      });
    };

  },

  afterEach: (t) => {
    shell.rm('-rf', t.context.dir);
    process.env.PATH = t.context.old.PATH;
  },

  after: (t) => {
    shell.rm('-rf', t.context.template);
  }
};

module.exports = {
  BASE_DIR,
  promiseSpawn,
  isInstalled,
  getTempDir,
  sharedHooks
};
