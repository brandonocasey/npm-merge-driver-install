const test = require('ava');
const {
  promiseSpawn,
  sharedHooks
} = require('./helpers.js');

test.before(sharedHooks.before);
test.beforeEach((t) => {
  sharedHooks.beforeEach(t);

  return t.context.installPackage().then(function() {
    return promiseSpawn('npx', ['--no-install', 'npm-merge-driver-install'], {cwd: t.context.dir});
  }).then(function(result) {
    return promiseSpawn('npm', ['i', '--package-lock-only', '-D', 'not-prerelease'], {cwd: t.context.dir});
  }).then(function(result) {
    return promiseSpawn('git', ['add', '--all'], {cwd: t.context.dir});
  }).then(function(result) {
    return promiseSpawn('git', ['commit', '-a', '-m', '"add not-prerelease to dev deps"'], {cwd: t.context.dir});
  });
});
test.afterEach.always(sharedHooks.afterEach);
test.after.always(sharedHooks.after);

test('can merge package-lock only changes', (t) => {
  let mainBranch;

  return promiseSpawn('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {cwd: t.context.dir}).then(function(result) {
    mainBranch = result.stdout.toString().trim();

    return promiseSpawn('git', ['checkout', '-b', 'merge-driver-test'], {cwd: t.context.dir});
  }).then(function(result) {
    return promiseSpawn('npm', ['i', '--package-lock-only', '-D', 'express'], {cwd: t.context.dir});
  }).then(function(result) {
    return promiseSpawn('git', ['add', '--all'], {cwd: t.context.dir});
  }).then(function(result) {
    return promiseSpawn('git', ['commit', '-a', '-m', '"add express to dev deps"'], {cwd: t.context.dir});
  }).then(function(result) {
    return promiseSpawn('git', ['checkout', mainBranch], {cwd: t.context.dir});
  }).then(function(result) {
    return promiseSpawn('npm', ['i', '--package-lock-only', 'express'], {cwd: t.context.dir});
  }).then(function(result) {
    return promiseSpawn('git', ['add', '--all'], {cwd: t.context.dir});
  }).then(function(result) {
    return promiseSpawn('git', ['commit', '-a', '-m', '"add express as dep"'], {cwd: t.context.dir});
  }).then(function(result) {
    return promiseSpawn('git', ['merge', '--no-edit', 'merge-driver-test'], {cwd: t.context.dir});
  }).then(function(result) {
    t.regex(result.stdout, /npm-merge-driver-install: package-lock.json merged successfully/, 'merge happened');
    return promiseSpawn('git', ['ls-files', '-u'], {cwd: t.context.dir});
  }).then(function(result) {
    // if we get nothing back from ls-files
    // everything was merged!
    t.falsy(t.stdout);
    t.falsy(t.stderr);
  });
});
