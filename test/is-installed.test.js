const test = require('ava');
const path = require('path');
const shell = require('shelljs');
const fs = require('fs');
const os = require('os');
const install = require('../src/install.js');
const uninstall = require('../src/uninstall.js');
const isInstalled = require('../src/is-installed.js');
const noop = require('../src/noop.js');
const {
  promiseSpawn,
  BASE_DIR,
  sharedHooks
} = require('./helpers.js');

test.before(sharedHooks.before);
test.beforeEach((t) => {
  sharedHooks.beforeEach(t);

  t.context.install = () => install(t.context.dir, {logger: {log: noop}});
  t.context.uninstall = () => uninstall(t.context.dir, {logger: {log: noop}});
});
test.afterEach.always(sharedHooks.afterEach);
test.after.always(sharedHooks.after);

test('not installed by default', (t) => {
  t.false(isInstalled(t.context.dir));
});

test('installed after install', (t) => {
  t.context.install();
  t.true(isInstalled(t.context.dir));
});

test('not installed after uninstall', (t) => {
  t.context.install();
  t.context.uninstall();
  t.false(isInstalled(t.context.dir));
});

test('not installed without .git', (t) => {
  shell.rm('-rf', path.join(t.context.dir, '.git'));

  t.false(isInstalled(t.context.dir));
});

test('not installed with bad git binary', (t) => {
  t.context.install();
  const env = t.context.fakegit();

  t.false(isInstalled(t.context.dir, {env}));
});

test('not installed without git binary', (t) => {
  t.context.install();
  t.false(isInstalled(t.context.dir, {env: {PATH: ''}}));
});

test('still installed with out .git/config but with attributes', (t) => {
  t.context.install();
  shell.rm('-f', path.join(t.context.dir, '.git', 'config'));
  t.true(isInstalled(t.context.dir));
});

test('still installed with out .git/info buh with config', (t) => {
  t.context.install();
  shell.rm('-rf', path.join(t.context.dir, '.git', 'info'));
  t.true(isInstalled(t.context.dir));
});

test('still installed with out .git/info/attributes but with config', (t) => {
  t.context.install();
  shell.rm('-f', path.join(t.context.dir, '.git', 'info', 'attributes'));
  t.true(isInstalled(t.context.dir));
});

test('installed with missing config install', (t) => {
  t.context.install();
  fs.writeFileSync(path.join(t.context.dir, '.git', 'config'), 'foo');
  t.true(isInstalled(t.context.dir));
});

test('installed with missing attr install', (t) => {
  t.context.install();
  fs.writeFileSync(path.join(t.context.dir, '.git', 'info', 'attributes'), 'foo');
  t.true(isInstalled(t.context.dir));
});

// windows can't run install.js as a binary
if (os.platform() !== 'win32') {
  test('exit code 0 if installed and run as binary', (t) => {
    t.context.install();

    return promiseSpawn(path.join(BASE_DIR, 'src', 'is-installed.js'), [], {cwd: t.context.dir}).then(function(result) {
      t.is(result.exitCode, 0);
      t.is(result.stderr, '');
      t.is(result.stdout, '');
    });
  });

  test('exit code 1 if not installed and run as binary', (t) => {
    return promiseSpawn(path.join(BASE_DIR, 'src', 'is-installed.js'), [], {cwd: t.context.dir, ignoreExitCode: true}).then(function(result) {
      t.is(result.exitCode, 1);
      t.is(result.stderr, '');
      t.is(result.stdout, '');
    });
  });

}

test('exit code 0 if installed and run with node', (t) => {
  t.context.install();

  return promiseSpawn('node', [path.join(BASE_DIR, 'src', 'is-installed.js')], {cwd: t.context.dir}).then(function(result) {
    t.is(result.exitCode, 0);
    t.is(result.stderr, '');
    t.is(result.stdout, '');
  });
});

test('exit code 1 if not installed and run with node', (t) => {
  return promiseSpawn('node', [path.join(BASE_DIR, 'src', 'is-installed.js')], {cwd: t.context.dir, ignoreExitCode: true}).then(function(result) {
    t.is(result.exitCode, 1);
    t.is(result.stderr, '');
    t.is(result.stdout, '');
  });
});

