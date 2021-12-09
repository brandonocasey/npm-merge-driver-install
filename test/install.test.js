const test = require('ava');
const path = require('path');
const shell = require('shelljs');
const os = require('os');
const {
  promiseSpawn,
  BASE_DIR,
  isInstalled,
  sharedHooks
} = require('./helpers.js');

test.before(sharedHooks.before);
test.beforeEach(sharedHooks.beforeEach);
test.afterEach.always(sharedHooks.afterEach);
test.after.always(sharedHooks.after);

test('does not install without .git', (t) => {
  shell.rm('-rf', path.join(t.context.dir, '.git'));

  return t.context.install().then(function(result) {
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

  return t.context.install({PATH}).then(function(result) {
    t.false(isInstalled(t.context.dir));
  });
});

test('does not install if in ci', (t) => {
  return t.context.install({TRAVIS: 'some-value'}).then(function(result) {
    t.false(isInstalled(t.context.dir));
  });
});

test('does not install if NPM_MERGE_DRIVER_SKIP_INSTALL=true', (t) => {
  return t.context.install({NPM_MERGE_DRIVER_SKIP_INSTALL: 'some-value'}).then(function(result) {
    t.false(isInstalled(t.context.dir));
  });
});

test('installs with .git', (t) => {
  return t.context.install().then(function(result) {
    t.true(isInstalled(t.context.dir));
  });
});

test('installs in ci if NPM_MERGE_DRIVER_IGNORE_CI=true', (t) => {
  return t.context.install({TRAVIS: 'some-value', NPM_MERGE_DRIVER_IGNORE_CI: 'some-value'}).then(function(result) {
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
  return t.context.install({NPM_MERGE_DRIVER_SKIP_INSTALL: 'some-value'}).then(function(result) {
    t.false(isInstalled(t.context.dir));
    return promiseSpawn('npm', ['bin'], {cwd: t.context.dir});
  }).then(function(result) {
    return promiseSpawn(path.join(result.stdout.trim(), 'npm-merge-driver-install'), [], {cwd: t.context.dir});
  }).then(function(result) {
    t.true(isInstalled(t.context.dir));
  });
});
