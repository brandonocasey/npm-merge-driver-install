const test = require('ava');
const path = require('path');
const shell = require('shelljs');
const fs = require('fs');
const os = require('os');
const install = require('../src/install.js');
const isInstalled = require('../src/is-installed.js');
const {
  promiseSpawn,
  BASE_DIR,
  sharedHooks
} = require('./helpers.js');

test.before(sharedHooks.before);
test.beforeEach((t) => {
  sharedHooks.beforeEach(t);
  t.context.install = function(options) {
    return install(t.context.dir, Object.assign({
      logger: t.context.fakeLogger
    }, options));
  };
});
test.afterEach.always(sharedHooks.afterEach);
test.after.always(sharedHooks.after);

test('does not install without .git', (t) => {
  shell.rm('-rf', path.join(t.context.dir, '.git'));

  const exitCode = t.context.install();

  t.false(isInstalled(t.context.dir));
  t.is(exitCode, 1);
  t.deepEqual(t.context.logs.sort(), [
    'Current working directory is not using git or git is not installed, skipping install.'
  ].sort());
});

test('does not install without git executable', (t) => {
  const exitCode = t.context.install({env: {PATH: ''}});

  t.false(isInstalled(t.context.dir));
  t.is(exitCode, 1);
  t.deepEqual(t.context.logs.sort(), [
    'Current working directory is not using git or git is not installed, skipping install.'
  ].sort());
});

test('does not install with bad git command', (t) => {
  const env = t.context.fakegit();
  const exitCode = t.context.install({env});

  t.false(isInstalled(t.context.dir));
  t.is(exitCode, 1);
  t.deepEqual(t.context.logs.sort(), [
    'Current working directory is not using git or git is not installed, skipping install.'
  ].sort());
});

test('can fail on git config', (t) => {
  const env = t.context.fakegit();
  const exitCode = t.context.install({env, getRoot: () => t.context.dir});

  t.false(isInstalled(t.context.dir));
  t.is(exitCode, 1);
  t.deepEqual(t.context.logs.sort(), [
    'Failed to configure npm-merge-driver-install in git directory'
  ].sort());
});

test('installs as function', (t) => {
  const exitCode = t.context.install();

  t.true(isInstalled(t.context.dir));
  t.is(exitCode, 0);
  t.deepEqual(t.context.logs.sort(), [
    'installed successfully'
  ].sort());
});

test('does not install twice', (t) => {
  const exitCode = t.context.install();

  t.true(isInstalled(t.context.dir));
  t.is(exitCode, 0);
  t.deepEqual(t.context.logs.sort(), [
    'installed successfully'
  ].sort());

  const exitCode2 = t.context.install();

  t.true(isInstalled(t.context.dir));
  t.is(exitCode2, 0);
  t.deepEqual(t.context.logs.sort(), [
    'installed successfully',
    'installed successfully'
  ].sort());
});

test('does not fail without .git/info directory', (t) => {
  shell.rm('-rf', path.join(t.context.dir, '.git', 'info'));
  const exitCode = t.context.install();

  t.true(isInstalled(t.context.dir));
  t.is(exitCode, 0);
  t.deepEqual(t.context.logs.sort(), [
    'installed successfully'
  ].sort());
});

test('does not fail with existing attributes file', (t) => {
  const attrFile = path.join(t.context.dir, '.git', 'info', 'attributes');

  fs.writeFileSync(attrFile, 'foo');
  const exitCode = t.context.install();

  t.true(isInstalled(t.context.dir));
  t.is(exitCode, 0);
  t.deepEqual(t.context.logs.sort(), [
    'installed successfully'
  ].sort());
});

// windows can't run install.js as a binary
if (os.platform() !== 'win32') {
  test('installs if run as binary', (t) => {
    return promiseSpawn(path.join(BASE_DIR, 'src', 'install.js'), [], {cwd: t.context.dir}).then(function(result) {
      t.true(isInstalled(t.context.dir));
      t.is(result.exitCode, 0);
      t.is(result.stderr, '');
      t.is(result.stdout, 'npm-merge-driver-install: installed successfully\n');
    });
  });
}

test('installs if run with node', (t) => {
  return promiseSpawn('node', [path.join(BASE_DIR, 'src', 'install.js')], {cwd: t.context.dir}).then(function(result) {
    t.true(isInstalled(t.context.dir));
    t.is(result.exitCode, 0);
    t.is(result.stderr, '');
    t.is(result.stdout, 'npm-merge-driver-install: installed successfully\n');
  });
});
