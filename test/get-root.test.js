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
