const test = require('ava');
const path = require('path');
const shell = require('shelljs');
const getRoot = require('../src/get-root.js');
const {sharedHooks} = require('./helpers.js');

test.before((t) => {
  return sharedHooks.before(t).then(function() {
    shell.mkdir(path.join(t.context.template, 'subdir'));

  });
});
test.beforeEach(sharedHooks.beforeEach);
test.afterEach.always(sharedHooks.afterEach);
test.after.always(sharedHooks.after);

test('can find root when it exists', (t) => {
  const result = getRoot(t.context.dir);

  t.truthy(result, 'is a valid path');
});

test('can find root from sub directory', (t) => {
  const result = getRoot(path.join(t.context.dir, 'subdir'));

  t.truthy(result, 'is a valid path');
});

test('no root without .git', (t) => {
  shell.rm('-rf', path.join(t.context.dir, '.git'));
  const result = getRoot(t.context.dir);

  t.falsy(result, 'is an empty string');
});

test('fails due to bad git executable', (t) => {
  const env = t.context.fakegit();
  const result = getRoot(t.context.dir, {env});

  t.falsy(result, 'is an empty string');
});

test('fails without git executable', (t) => {
  const result = getRoot(t.context.dir, {env: {PATH: ''}});

  t.falsy(result, 'is an empty string');
});

test('can use process.cwd()', (t) => {
  const result = getRoot(null, {
    process: {cwd: () => t.context.dir}
  });

  t.truthy(result, 'is a valid path');
});

test('can use INIT_CWD', (t) => {
  const result = getRoot(null, {
    env: {INIT_CWD: t.context.dir}
  });

  t.truthy(result, 'is a valid path');
});

