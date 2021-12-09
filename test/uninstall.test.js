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
test.beforeEach((t) => {
  sharedHooks.beforeEach(t);

  t.context.uninstall = function(env = {}) {
    return promiseSpawn('node', [path.join(BASE_DIR, 'src', 'uninstall.js')], {cwd: t.context.dir, env});
  };

  return t.context.install().then(function() {
    t.true(isInstalled(t.context.dir));
    return Promise.resolve();
  });
});
test.afterEach.always(sharedHooks.afterEach);
test.after.always(sharedHooks.after);

test('can uninstall', (t) => {
  return t.context.uninstall().then(function(result) {
    t.false(isInstalled(t.context.dir));
  });
});

test('does not fail without .git', (t) => {
  shell.rm('-rf', path.join(t.context.dir, '.git'));

  return t.context.uninstall().then(function(result) {
    t.false(isInstalled(t.context.dir));
  });
});

test('does not fail with bad git binary', (t) => {
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

  return t.context.uninstall({PATH}).then(function(result) {
    t.true(isInstalled(t.context.dir));
  });
});

