import { spawn } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { v4 as uuidv4 } from 'uuid';
import { getPackageManagerBinaries, isWindowsLike } from '../src/package-managers.js';

const require = createRequire(import.meta.url);
const installLocalBin = require.resolve('install-local/bin/install-local');

const BASE_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TEMP_DIR = os.tmpdir();

const getTempDir = () => path.join(TEMP_DIR, uuidv4());

/**
 * Kills a process tree on Windows/WSL to prevent hanging processes
 * that can hold file locks and cause EBUSY errors.
 *
 * @param {number} pid - Process ID to kill
 * @returns {Promise<void>} Resolves when process tree is killed or timeout occurs
 */
const killWindowsProcessTree = (pid) => {
  return new Promise((resolve) => {
    try {
      const killProcess = spawn('taskkill', ['/pid', pid.toString(), '/T', '/F']);

      let stderr = '';
      if (killProcess.stderr) {
        killProcess.stderr.on('data', (data) => {
          stderr += data.toString();
        });
      }

      killProcess.on('close', (exitCode) => {
        // Exit codes: 0 = success, 128 = process not found (already dead)
        if (exitCode !== 0 && exitCode !== 128) {
          console.warn(`taskkill failed for PID ${pid} with code ${exitCode}: ${stderr}`);
        }
        // Give file handles a moment to release after process termination
        setTimeout(resolve, 100);
      });

      // Timeout after 5 seconds to prevent hanging tests
      setTimeout(() => {
        try {
          killProcess.kill('SIGKILL');
        } catch (_error) {
          // Process may have already exited
        }
        resolve();
      }, 5000);
    } catch (error) {
      // Only ignore "process not found" errors, log everything else
      if (!(error.message.includes('not found') || error.message.includes('No such process'))) {
        console.warn(`Failed to kill process tree for PID ${pid}:`, error.message);
      }
      resolve();
    }
  });
};

/**
 * Sets up Windows/WSL shell command configuration for package managers
 * that need shell: true on Windows (.cmd batch files).
 *
 * @param {string} bin - Binary name
 * @param {string[]} args - Arguments array
 * @param {object} options - Spawn options
 * @returns {object} Configured spawn parameters
 */
const setupWindowsShellCommand = (bin, args, options) => {
  const cmdBatchFiles = getPackageManagerBinaries();

  if (isWindowsLike() && cmdBatchFiles.includes(bin)) {
    return {
      spawnBin: `${bin} ${args.join(' ')}`,
      spawnArgs: [],
      options: { ...options, shell: true },
    };
  }

  return { spawnBin: bin, spawnArgs: args, options };
};

/**
 * Spawns a child process and returns a promise that resolves with stdout/stderr.
 * On Windows/WSL, uses 'exit' event instead of 'close' because shell-spawned
 * processes may not properly close stdio streams, causing the 'close' event
 * to never fire and resulting in test timeouts.
 *
 * Related: https://github.com/nodejs/node/issues/21632
 *
 * @param {string} bin - Binary to execute
 * @param {string[]} args - Arguments array
 * @param {object} options - Spawn options plus ignoreExitCode flag
 * @returns {Promise<{exitCode: number, stdout: string, stderr: string}>}
 */
const promiseSpawn = (bin, args, options = {}) => {
  const ignoreExitCode = options.ignoreExitCode;

  delete options.ignoreExitCode;
  options = { stdio: 'pipe', encoding: 'utf8', ...options };

  options.env = options.env || {};
  options.env.PATH = options.env.PATH || process.env.PATH;

  const { spawnBin, spawnArgs, options: finalOptions } = setupWindowsShellCommand(bin, args, options);

  return new Promise((resolve, reject) => {
    const child = spawn(spawnBin, spawnArgs, finalOptions);
    let stdout = '';
    let stderr = '';
    let resolved = false;

    if (child.stdout) {
      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });
    }

    if (child.stderr) {
      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });
    }

    const handleError = async (error) => {
      if (resolved) {
        return;
      }
      resolved = true;

      // Cleanup process tree on Windows/WSL before rejecting
      if (finalOptions.shell && isWindowsLike()) {
        await killWindowsProcessTree(child.pid);
      }

      reject(error);
    };

    const handleExit = async (exitCode) => {
      if (resolved) {
        return;
      }
      resolved = true;

      // Kill process tree on Windows/WSL to prevent hanging child processes
      // that can hold file locks and cause EBUSY errors in cleanup
      if (finalOptions.shell && isWindowsLike()) {
        await killWindowsProcessTree(child.pid);
      }

      if (!ignoreExitCode && exitCode !== 0) {
        reject(new Error(`command ${bin} ${args.join(' ')} failed with code ${exitCode}\n${stdout}${stderr}`));
      } else {
        resolve({
          exitCode,
          stderr,
          stdout,
        });
      }
    };

    child.on('error', handleError);

    // On Windows/WSL with shell: true, use 'exit' event instead of 'close'
    // because shell-spawned processes may not properly close stdio streams,
    // preventing the 'close' event from firing and causing test timeouts.
    // Note: This means we may lose trailing stdout/stderr if streams haven't
    // fully flushed, but in practice this is rare and better than hanging forever.
    const exitEvent = finalOptions.shell && isWindowsLike() ? 'exit' : 'close';

    child.on(exitEvent, handleExit);
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
      .then((_result) => promiseSpawn('npm', ['install', '--package-lock-only'], { cwd: context.template }))
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
    // Restore PATH first
    process.env.PATH = context.old.PATH;

    // Clean up temporary directory
    // This may fail in CI due to file locks, but that's okay - just log a warning
    try {
      fs.rmSync(context.dir, { recursive: true, force: true });
    } catch (error) {
      console.warn(`Warning: Failed to cleanup ${context.dir}: ${error.message}`);
      console.warn('Temporary files may remain. This should not affect test results.');
    }
  },

  after: (context) => {
    try {
      fs.rmSync(context.template, { recursive: true, force: true });
    } catch (error) {
      console.warn(`Warning: Failed to cleanup template ${context.template}: ${error.message}`);
    }
  },
};

export { BASE_DIR, promiseSpawn, sharedHooks };
