const test = require('ava');
const path = require('path');
const shell = require('shelljs');
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

  t.context.uninstall = function(options) {
    return uninstall(t.context.dir, Object.assign({
      logger: t.context.fakeLogger
    }, options));
  };

  const exitCode = install(t.context.dir, {logger: {log: noop}});

  t.is(exitCode, 0);
  t.true(isInstalled(t.context.dir));
});
test.afterEach.always(sharedHooks.afterEach);
test.after.always(sharedHooks.after);

test('can uninstall', (t) => {
  const exitCode = t.context.uninstall();

  t.false(isInstalled(t.context.dir));
  t.is(exitCode, 0);
  t.deepEqual(t.context.logs.sort(), [
    'uninstalled successfully'
  ].sort());
});

test('does not fail without .git', (t) => {
  shell.rm('-rf', path.join(t.context.dir, '.git'));
  const exitCode = t.context.uninstall();

  t.false(isInstalled(t.context.dir));
  t.is(exitCode, 0);
  t.deepEqual(t.context.logs.sort(), [
    'uninstalled successfully'
  ].sort());
});

test('does not fail with bad git binary', (t) => {
  const env = t.context.fakegit();
  const exitCode = t.context.uninstall(null, {env});

  t.false(isInstalled(t.context.dir));
  t.is(exitCode, 0);
  t.deepEqual(t.context.logs.sort(), [
    'uninstalled successfully'
  ].sort());
});

test('does not fail without git binary', (t) => {
  const exitCode = t.context.uninstall(null, {env: {PATH: ''}});

  t.false(isInstalled(t.context.dir));
  t.is(exitCode, 0);
  t.deepEqual(t.context.logs.sort(), [
    'uninstalled successfully'
  ].sort());
});

test('does not fail without .git/info directory', (t) => {
  shell.rm('-rf', path.join(t.context.dir, '.git', 'info'));
  const exitCode = t.context.uninstall();

  t.false(isInstalled(t.context.dir));
  t.is(exitCode, 0);
  t.deepEqual(t.context.logs.sort(), [
    'uninstalled successfully'
  ].sort());
});

test('does not fail without existing attributes file', (t) => {
  const attrFile = path.join(t.context.dir, '.git', 'info', 'attributes');

  shell.rm('-f', attrFile);
  const exitCode = t.context.uninstall();

  t.false(isInstalled(t.context.dir));
  t.is(exitCode, 0);
  t.deepEqual(t.context.logs.sort(), [
    'uninstalled successfully'
  ].sort());
});

// windows can't run install.js as a binary
if (os.platform() !== 'win32') {
  test('uninstalls if run as binary', (t) => {
    return promiseSpawn(path.join(BASE_DIR, 'src', 'uninstall.js'), [], {cwd: t.context.dir}).then(function(result) {
      t.false(isInstalled(t.context.dir));
      t.is(result.exitCode, 0);
      t.is(result.stderr, '');
      t.is(result.stdout, 'npm-merge-driver-install: uninstalled successfully\n');
    });
  });
}

test('uninstalls if run with node', (t) => {
  return promiseSpawn('node', [path.join(BASE_DIR, 'src', 'uninstall.js')], {cwd: t.context.dir}).then(function(result) {
    t.false(isInstalled(t.context.dir));
    t.is(result.exitCode, 0);
    t.is(result.stderr, '');
    t.is(result.stdout, 'npm-merge-driver-install: uninstalled successfully\n');
  });
});
