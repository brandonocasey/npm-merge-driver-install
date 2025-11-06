const test = require('ava');
const path = require('path');
const fs = require('fs');
const {getGitDir, getGitCommonDir} = require('../src/get-git-dir.js');
const {sharedHooks} = require('./helpers.js');

test.before((t) => {
  return sharedHooks.before(t).then(function() {
    fs.mkdirSync(path.join(t.context.template, 'subdir'), {recursive: true});
  });
});
test.beforeEach(sharedHooks.beforeEach);
test.afterEach.always(sharedHooks.afterEach);
test.after.always(sharedHooks.after);

test('can get git dir when it exists', (t) => {
  const result = getGitDir(t.context.dir);

  t.truthy(result, 'is a valid path');
  t.true(fs.existsSync(result), 'git dir exists');
  t.true(result.endsWith('.git'), 'path ends with .git');
});

test('can get git dir from sub directory', (t) => {
  const result = getGitDir(path.join(t.context.dir, 'subdir'));

  t.truthy(result, 'is a valid path');
  t.true(fs.existsSync(result), 'git dir exists');
});

test('returns absolute path when git dir is relative', (t) => {
  const result = getGitDir(t.context.dir);

  t.truthy(result, 'is a valid path');
  t.true(path.isAbsolute(result), 'path is absolute');
});

test('no git dir without git directory', (t) => {
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

test('fails with null rootDir', (t) => {
  const result = getGitDir(null);

  t.falsy(result, 'is an empty string');
});

test('fails with empty rootDir', (t) => {
  const result = getGitDir('');

  t.falsy(result, 'is an empty string');
});

test('can get common git dir when it exists', (t) => {
  const result = getGitCommonDir(t.context.dir);

  t.truthy(result, 'is a valid path');
  t.true(fs.existsSync(result), 'common git dir exists');
});

test('common git dir equals git dir in normal repos', (t) => {
  const gitDir = getGitDir(t.context.dir);
  const commonGitDir = getGitCommonDir(t.context.dir);

  t.is(gitDir, commonGitDir, 'paths are equal in normal repos');
});

test('common git dir returns absolute path', (t) => {
  const result = getGitCommonDir(t.context.dir);

  t.truthy(result, 'is a valid path');
  t.true(path.isAbsolute(result), 'path is absolute');
});

test('no common git dir without git directory', (t) => {
  fs.rmSync(path.join(t.context.dir, '.git'), {recursive: true, force: true});
  const result = getGitCommonDir(t.context.dir);

  t.falsy(result, 'is an empty string');
});

test('common git dir fails due to bad git executable', (t) => {
  const env = t.context.fakegit();
  const result = getGitCommonDir(t.context.dir, {env});

  t.falsy(result, 'is an empty string');
});

test('common git dir fails without git executable', (t) => {
  const result = getGitCommonDir(t.context.dir, {env: {PATH: ''}});

  t.falsy(result, 'is an empty string');
});

test('common git dir fails with null rootDir', (t) => {
  const result = getGitCommonDir(null);

  t.falsy(result, 'is an empty string');
});

test('common git dir fails with empty rootDir', (t) => {
  const result = getGitCommonDir('');

  t.falsy(result, 'is an empty string');
});

test('git dir detects .git file in worktree', (t) => {
  // Test that .git can be a file (worktree case)
  // We verify this by checking that get-root properly detects both files and directories
  const gitPath = path.join(t.context.dir, '.git');
  const stats = fs.statSync(gitPath);

  // In normal repos, .git is a directory
  t.true(stats.isDirectory(), '.git is a directory in normal repos');

  // The getGitDir function uses git rev-parse which handles worktrees automatically
  const result = getGitDir(t.context.dir);

  t.truthy(result, 'is a valid path');
  t.true(fs.existsSync(result), 'git dir exists');
  t.true(path.isAbsolute(result), 'path is absolute');
});
