const test = require('ava');
const path = require('path');
const fs = require('fs');
const getGitDir = require('../src/get-git-dir.js');
const {sharedHooks} = require('./helpers.js');

test.before((t) => {
  return sharedHooks.before(t).then(function() {
    fs.mkdirSync(path.join(t.context.template, 'subdir'), {recursive: true});

  });
});
test.beforeEach(sharedHooks.beforeEach);
test.afterEach.always(sharedHooks.afterEach);
test.after.always(sharedHooks.after);

test('can find git dir when it exists', (t) => {
  const result = getGitDir(t.context.dir);

  t.truthy(result, 'is a valid path');
  t.true(result.endsWith('.git'), 'points to .git directory');
});

test('can find git dir from sub directory', (t) => {
  const result = getGitDir(path.join(t.context.dir, 'subdir'));

  t.truthy(result, 'is a valid path');
  t.true(result.endsWith('.git'), 'points to .git directory');
});

test('no git dir without .git', (t) => {
  fs.rmSync(path.join(t.context.dir, '.git'), {recursive: true, force: true});
  const result = getGitDir(t.context.dir);

  t.falsy(result, 'is an empty string');
});

test('fails due to bad git executable', (t) => {
  const env = t.context.fakegit();
  const result = getGitDir(t.context.dir, {env});

  t.falsy(result, 'is an empty string');
});

test('fails without git executable', (t) => {
  const result = getGitDir(t.context.dir, {env: {PATH: ''}});

  t.falsy(result, 'is an empty string');
});

test('can use process.cwd()', (t) => {
  const result = getGitDir(null, {
    process: {cwd: () => t.context.dir}
  });

  t.truthy(result, 'is a valid path');
});

test('can use INIT_CWD', (t) => {
  const result = getGitDir(null, {
    env: {INIT_CWD: t.context.dir}
  });

  t.truthy(result, 'is a valid path');
});

