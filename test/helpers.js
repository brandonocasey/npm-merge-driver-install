import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import spawnPromise from '@brandonocasey/spawn-promise';
import { v4 as uuidv4 } from 'uuid';
import isInstalled from '../src/is-installed.js';

const require = createRequire(import.meta.url);
const installLocalBin = require.resolve('install-local/bin/install-local');

const BASE_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TEMP_DIR = os.tmpdir();

const getTempDir = () => path.join(TEMP_DIR, uuidv4());

const promiseSpawn = (bin, args, options = {}) => {
  const ignoreExitCode = options.ignoreExitCode;

  delete options.ignoreExitCode;
  options = { shell: true, stdio: 'pipe', encoding: 'utf8', ...options };
  options.env = options.env || {};
  options.env.PATH = options.env.PATH || process.env.PATH;

  return spawnPromise(bin, args, options).then(({ status, stderr, stdout, combined }) => {
    if (!ignoreExitCode && status !== 0) {
      return Promise.reject(`command ${bin} ${args.join(' ')} failed with code ${status}\n${combined}`);
    }
    return Promise.resolve({ exitCode: status, stderr, stdout });
  });
};

const sharedHooks = {
  before: (context) => {
    context.template = getTempDir();

    fs.mkdirSync(context.template, { recursive: true });
    fs.writeFileSync(path.join(context.template, '.gitignore'), 'node_modules\n');

    // create the package.json
    return promiseSpawn('npm', ['init', '-y'], { cwd: context.template })
      .then((_result) => {
        // create the .git dir
        return promiseSpawn('git', ['init'], { cwd: context.template });
      })
      .then((_result) => promiseSpawn('npm', ['install', '--package-lock-only']))
      .then((_result) => promiseSpawn('git', ['add', '--all'], { cwd: context.template }))
      .then((_result) =>
        promiseSpawn('git', ['config', '--local', 'user.email', '"you@example.com"'], { cwd: context.template }),
      )
      .then((_result) =>
        promiseSpawn('git', ['config', '--local', 'user.name', '"Your Name"'], { cwd: context.template }),
      )
      .then((_result) => promiseSpawn('git', ['commit', '-a', '-m', '"initial"'], { cwd: context.template }));
  },
  beforeEach: (context) => {
    context.old = {
      PATH: process.env.PATH,
    };
    context.logs = [];
    context.fakeLogger = {
      log: (...args) => {
        context.logs.push.apply(context.logs, args);
      },
    };

    context.dir = getTempDir();
    fs.cpSync(context.template, context.dir, { recursive: true });

    context.installPackage = (env = {}) => promiseSpawn('node', [installLocalBin, BASE_DIR], { cwd: context.dir, env });

    context.fakegit = () => {
      // put the tempdir path as highest priorty in PATH
      let separator = ':';
      let gitDest = path.join(context.dir, 'git');

      if (os.platform() === 'win32') {
        separator = ';';
        gitDest += '.exe';
      }

      // move a fake git binary into the temp context dir
      // this will cause git to fail to run
      fs.copyFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'fakegit.js'), gitDest);

      // Make the file executable
      fs.chmodSync(gitDest, 0o755);

      return { ...process.env, PATH: `${context.dir}${separator}${process.env.PATH}` };
    };
  },

  afterEach: (context) => {
    fs.rmSync(context.dir, { recursive: true, force: true });
    process.env.PATH = context.old.PATH;
  },

  after: (context) => {
    fs.rmSync(context.template, { recursive: true, force: true });
  },
};

export { BASE_DIR, promiseSpawn, isInstalled, getTempDir, sharedHooks };
