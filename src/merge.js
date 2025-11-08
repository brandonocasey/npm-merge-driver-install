#!/usr/bin/env node
import path from 'node:path';
import process from 'node:process';
import detectYarnVersion from './detect-yarn-version.js';
import getRoot from './get-root.js';
import { log } from './logger.js';
import { attemptTextMerge, finalizeMerge, removeConflictedLockfile, runPackageManager } from './merge-lockfile.js';
import { mergePackageJson } from './merge-package-json.js';
import { getPackageManagerByLockfile, packageManagers } from './package-managers.js';
import { resolvePackageJsonConflicts, validatePackageJsonResolved } from './resolve-package-json-conflicts.js';

const currentVersion = process.argv[2];
const ancestorVersion = process.argv[3];
const otherVersion = process.argv[4];
const file = process.argv[5];

const rootDir = getRoot(process.cwd());

if (!rootDir) {
  log('ERROR: Could not find git repository root');
  process.exit(1);
}

const resolvedFile = path.resolve(file);
const resolvedRoot = path.resolve(rootDir);

if (!resolvedFile.startsWith(resolvedRoot)) {
  log(`ERROR: ${file} is outside repository bounds`);
  process.exit(1);
}

// Special handling for package.json merge
if (file.endsWith('package.json')) {
  mergePackageJson(currentVersion, ancestorVersion, otherVersion, file, rootDir);
  // mergePackageJson exits the process, so we never reach here
}

// Lockfile merging logic
let pm = getPackageManagerByLockfile(file);

if (!pm) {
  log(`ERROR: ${file} is not a recognized lockfile`);
  process.exit(1);
}

if (file.endsWith('yarn.lock')) {
  const yarnVersion = detectYarnVersion(path.dirname(file));
  const pmKey = yarnVersion === 'berry' ? 'yarn-berry' : 'yarn-classic';

  pm = packageManagers[pmKey];
}

const supportsTextMerge =
  typeof pm.supportsTextMerge === 'function' ? pm.supportsTextMerge(file) : pm.supportsTextMerge;

// Attempt text-based merge for lockfile
const hadTextMergeConflicts = attemptTextMerge(currentVersion, ancestorVersion, otherVersion, file, supportsTextMerge);

// Resolve package.json conflicts if enabled
resolvePackageJsonConflicts(file, rootDir, pm);

// Remove conflicted lockfile if needed
removeConflictedLockfile(file, hadTextMergeConflicts);

// Validate package.json is resolved before running package manager
validatePackageJsonResolved(file, pm);

// Run package manager to regenerate lockfile
runPackageManager(pm, file);

// Finalize merge by writing merged content to output
finalizeMerge(currentVersion, file);

log(`${file} merged successfully`);
