#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import parseConflictJson from 'parse-conflict-json';
import detectYarnVersion from './detect-yarn-version.js';
import getRoot from './get-root.js';
import { log } from './logger.js';
import { getPackageManagerByLockfile, packageManagers } from './package-managers.js';

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

if (supportsTextMerge) {
  log(`attempting text-based merge for ${file}`);
  const ret = spawnSync('git', ['merge-file', '-p', currentVersion, ancestorVersion, otherVersion], {
    stdio: [0, 'pipe', 2],
  });

  if (ret.status !== 0) {
    log('text-based merge had conflicts, relying on package manager to regenerate');
  }

  try {
    fs.writeFileSync(file, ret.stdout);
  } catch (error) {
    log(`ERROR: Failed to write merged content to ${file}: ${error.message}`);
    process.exit(1);
  }
} else {
  log(`${file} is binary format, skipping text-based merge`);
}

// Check if package.json conflict resolution is enabled and needed
const packageJsonPath = path.join(path.dirname(file), 'package.json');
const resolvePackageJsonConfig = spawnSync(
  'git',
  // biome-ignore lint/security/noSecrets: False positive - this is a git config key, not a secret
  ['config', '--local', 'merge.npm-merge-driver-install.resolvePackageJson'],
  {
    cwd: rootDir,
    encoding: 'utf8',
  },
);

if (resolvePackageJsonConfig.status === 0 && resolvePackageJsonConfig.stdout.trim()) {
  const strategy = resolvePackageJsonConfig.stdout.trim();

  log(`package.json conflict resolution is enabled with strategy: ${strategy}`);

  if (fs.existsSync(packageJsonPath)) {
    const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf8');

    // Check for conflict markers
    if (
      packageJsonContent.includes('<<<<<<<') &&
      packageJsonContent.includes('=======') &&
      packageJsonContent.includes('>>>>>>>')
    ) {
      log(`package.json has conflicts, attempting automatic resolution using '${strategy}' strategy`);

      try {
        const resolved = parseConflictJson(packageJsonContent, null, strategy);
        fs.writeFileSync(packageJsonPath, `${JSON.stringify(resolved, null, 2)}\n`);
        log(`package.json conflicts resolved successfully using '${strategy}' strategy`);
      } catch (error) {
        log(`ERROR: Failed to auto-resolve package.json conflicts: ${error.message}`);
        log(
          `ACTION REQUIRED: Manually resolve package.json conflicts, then run: ${pm.getExecutable()} ${pm.getMergeArgs().join(' ')}`,
        );
        console.log();
        process.exit(1);
      }
    }
  }
}

const executable = pm.getExecutable();
const args = pm.getMergeArgs();

log(`running ${executable} ${args.join(' ')} to resolve lockfile`);
const install = spawnSync(executable, args, { cwd: path.dirname(file) });

if (install.status !== 0) {
  log(`ERROR: Failed to merge ${file}`);
  log(`ACTION REQUIRED: Resolve package.json conflicts, then run: ${executable} ${args.join(' ')}`);
  console.log();
  process.exit(1);
}

try {
  const mergedContent = fs.readFileSync(file);

  fs.writeFileSync(currentVersion, mergedContent);
} catch (error) {
  log(`ERROR: Failed to finalize merge for ${file}: ${error.message}`);
  process.exit(1);
}

log(`${file} merged successfully`);
