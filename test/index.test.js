const test = require('ava');
const path = require('path');
const shell = require('shelljs');
const uuid = require('uuid');
const spawnPromise = require('@brandonocasey/spawn-promise');
const os = require('os');

const BASE_DIR = path.resolve(__dirname, '..');
const TEMP_DIR = shell.tempdir();

const getTempDir = function() {
  return path.join(TEMP_DIR, uuid.v4());
};

const isInstalled = function(dir) {
  const gitConfigPath = path.join(dir, '.git', 'config');
  const gitAttrPath = path.join(dir, '.git', 'info', 'attributes');

  if (!shell.test('-f', gitConfigPath)) {
    return false;
  }

  const config = shell.cat(gitConfigPath);

  if (!(/npm-merge-driver-install/i).test(config)) {
    return false;
  }

  if (!shell.test('-f', gitAttrPath)) {
    return false;
  }

  const attr = shell.cat(gitAttrPath);

  if (!(/npm-merge-driver-install/i).test(attr)) {
    return false;
  }

  return true;
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

test.before((t) => {
  t.context = {
    template: getTempDir()
  };

  shell.mkdir(t.context.template);

  // create the package.json
  return promiseSpawn('npm', ['init', '-y'], {cwd: t.context.template}).then(function(result) {
    // create the .git dir
    return promiseSpawn('git', ['init'], {cwd: t.context.template});
  }).then(function(result) {
    return promiseSpawn('git', ['add', '--all'], {cwd: t.context.template});
  }).then(function(result) {
    return promiseSpawn('git', ['config', '--local', 'user.email', '"you@example.com"'], {cwd: t.context.template});
  }).then(function(result) {
    return promiseSpawn('git', ['config', '--local', 'user.name', '"Your Name"'], {cwd: t.context.template});
  }).then(function(result) {
    return promiseSpawn('git', ['commit', '-a', '-m', '"initial"'], {cwd: t.context.template});
  });
});

test.beforeEach((t) => {
  t.context.dir = getTempDir();
  shell.cp('-R', t.context.template, t.context.dir);

  t.context.link = function(env = {}) {
    return promiseSpawn('npm', ['install', BASE_DIR], {cwd: t.context.dir, env}).then(function(result) {
      return Promise.resolve(result);
    });
  };

});

test.afterEach.always((t) => {
  shell.rm('-rf', t.context.dir);
});

test.after.always((t) => {
  shell.rm('-rf', t.context.template);
});

test('does not install without .git', (t) => {
  shell.rm('-rf', path.join(t.context.dir, '.git'));

  return t.context.link().then(function(result) {
    t.false(isInstalled(t.context.dir));
  });
});

test('does not install with bad git command', (t) => {
  // put the tempdir path as highest priorty in PATH
  let separator = ':';
  let gitDest = path.join(t.context.dir, 'git');

  if (os.platform() === 'win32') {
    separator = ';';
    gitDest += '.exe';
  }
  const PATH = `${t.context.dir}${separator}${process.env.PATH}`;

  // move a fake git binary into the temp context dir
  // this will cause git to fail to run
  shell.cp(path.join(__dirname, 'fakegit.js'), gitDest);

  return t.context.link({PATH}).then(function(result) {
    t.false(isInstalled(t.context.dir));
  });
});

test('does not install if in ci', (t) => {
  return t.context.link({TRAVIS: 'some-value'}).then(function(result) {
    t.false(isInstalled(t.context.dir));
  });
});

test('does not install if NPM_MERGE_DRIVER_SKIP_INSTALL=true', (t) => {
  return t.context.link({NPM_MERGE_DRIVER_SKIP_INSTALL: 'some-value'}).then(function(result) {
    t.false(isInstalled(t.context.dir));
  });
});

test('installs with .git', (t) => {
  return t.context.link().then(function(result) {
    t.true(isInstalled(t.context.dir));
  });
});

test('installs in ci if NPM_MERGE_DRIVER_IGNORE_CI=true', (t) => {
  return t.context.link({TRAVIS: 'some-value', NPM_MERGE_DRIVER_IGNORE_CI: 'some-value'}).then(function(result) {
    t.true(isInstalled(t.context.dir));
  });
});

// windows can't run install.js as a binary
if (os.platform() !== 'win32') {
  test('installs in cwd if run as binary', (t) => {
    return promiseSpawn(path.join(BASE_DIR, 'src', 'install.js'), [], {cwd: t.context.dir}).then(function(result) {
      t.true(isInstalled(t.context.dir));
    });
  });
}

test('Can install after npm install with binary', (t) => {
  return t.context.link({NPM_MERGE_DRIVER_SKIP_INSTALL: 'some-value'}).then(function(result) {
    t.false(isInstalled(t.context.dir));
    return promiseSpawn('npm', ['bin'], {cwd: t.context.dir});
  }).then(function(result) {
    return promiseSpawn(path.join(result.stdout.trim(), 'npm-merge-driver-install'), [], {cwd: t.context.dir});
  }).then(function(result) {
    t.true(isInstalled(t.context.dir));
  });
});
