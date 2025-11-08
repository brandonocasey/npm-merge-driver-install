import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getFileFromIndex, getGitConfig, hasUnmergedEntries, stageFile } from '../../src/utils/git-helpers.js';

describe('git-helpers', () => {
  let testDir;

  beforeEach(() => {
    // Create a temporary directory for testing
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'git-helpers-test-'));

    // Initialize a git repo
    spawnSync('git', ['init'], { cwd: testDir });
    spawnSync('git', ['config', 'user.email', 'test@example.com'], { cwd: testDir });
    spawnSync('git', ['config', 'user.name', 'Test User'], { cwd: testDir });
  });

  afterEach(() => {
    // Clean up
    if (testDir && fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  // biome-ignore lint/security/noSecrets: False positive - this is a function name, not a secret
  describe('getGitConfig', () => {
    it('returns config value when it exists', () => {
      spawnSync('git', ['config', '--local', 'test.key', 'test-value'], { cwd: testDir });

      const result = getGitConfig('test.key', testDir);
      expect(result).toBe('test-value');
    });

    it('returns null when config key does not exist', () => {
      const result = getGitConfig('nonexistent.key', testDir);
      expect(result).toBe(null);
    });

    it('trims whitespace from config values', () => {
      spawnSync('git', ['config', '--local', 'test.spaces', '  value-with-spaces  '], { cwd: testDir });

      const result = getGitConfig('test.spaces', testDir);
      expect(result).toBe('value-with-spaces');
    });
  });

  // biome-ignore lint/security/noSecrets: False positive - this is a function name, not a secret
  describe('hasUnmergedEntries', () => {
    it('returns false when file has no conflicts', () => {
      // Create and commit a file
      fs.writeFileSync(path.join(testDir, 'test.txt'), 'content');
      spawnSync('git', ['add', 'test.txt'], { cwd: testDir });
      spawnSync('git', ['commit', '-m', 'initial'], { cwd: testDir });

      const result = hasUnmergedEntries('test.txt', testDir);
      expect(result).toBe(false);
    });

    it('returns false for non-existent file', () => {
      const result = hasUnmergedEntries('nonexistent.txt', testDir);
      expect(result).toBe(false);
    });

    it('returns true when file has unmerged entries', () => {
      // Create initial commit
      fs.writeFileSync(path.join(testDir, 'test.txt'), 'base content');
      spawnSync('git', ['add', 'test.txt'], { cwd: testDir });
      spawnSync('git', ['commit', '-m', 'initial'], { cwd: testDir });

      // Create a branch and modify file
      spawnSync('git', ['checkout', '-b', 'branch1'], { cwd: testDir });
      fs.writeFileSync(path.join(testDir, 'test.txt'), 'branch1 content');
      spawnSync('git', ['commit', '-am', 'branch1 change'], { cwd: testDir });

      // Go back to main and make conflicting change
      spawnSync('git', ['checkout', '-'], { cwd: testDir });
      fs.writeFileSync(path.join(testDir, 'test.txt'), 'main content');
      spawnSync('git', ['commit', '-am', 'main change'], { cwd: testDir });

      // Try to merge - this will create conflicts
      spawnSync('git', ['merge', 'branch1'], { cwd: testDir });

      const result = hasUnmergedEntries('test.txt', testDir);
      expect(result).toBe(true);
    });
  });

  // biome-ignore lint/security/noSecrets: False positive - this is a function name, not a secret
  describe('getFileFromIndex', () => {
    it('returns null for non-existent file', () => {
      const result = getFileFromIndex(':2:', 'nonexistent.txt', testDir);
      expect(result).toBe(null);
    });

    it('returns file content from index during conflict', () => {
      // Create initial commit
      fs.writeFileSync(path.join(testDir, 'test.txt'), 'base content');
      spawnSync('git', ['add', 'test.txt'], { cwd: testDir });
      spawnSync('git', ['commit', '-m', 'initial'], { cwd: testDir });

      // Create a branch and modify file
      spawnSync('git', ['checkout', '-b', 'branch1'], { cwd: testDir });
      fs.writeFileSync(path.join(testDir, 'test.txt'), 'branch1 content');
      spawnSync('git', ['commit', '-am', 'branch1 change'], { cwd: testDir });

      // Go back to main and make conflicting change
      spawnSync('git', ['checkout', '-'], { cwd: testDir });
      fs.writeFileSync(path.join(testDir, 'test.txt'), 'main content');
      spawnSync('git', ['commit', '-am', 'main change'], { cwd: testDir });

      // Try to merge - this will create conflicts
      spawnSync('git', ['merge', 'branch1'], { cwd: testDir });

      // Get both versions
      const oursContent = getFileFromIndex(':2:', 'test.txt', testDir);
      const theirsContent = getFileFromIndex(':3:', 'test.txt', testDir);

      expect(oursContent).toBe('main content');
      expect(theirsContent).toBe('branch1 content');
    });
  });

  describe('stageFile', () => {
    it('returns true when staging succeeds', () => {
      fs.writeFileSync(path.join(testDir, 'test.txt'), 'content');

      const result = stageFile('test.txt', testDir);
      expect(result).toBe(true);

      // Verify file is staged
      const status = spawnSync('git', ['status', '--porcelain', 'test.txt'], {
        cwd: testDir,
        encoding: 'utf8',
      });
      expect(status.stdout).toContain('A  test.txt');
    });

    it('returns false when staging fails for non-existent file', () => {
      const result = stageFile('nonexistent.txt', testDir);
      expect(result).toBe(false);
    });

    it('stages resolved file after conflict', () => {
      // Create initial commit
      fs.writeFileSync(path.join(testDir, 'test.txt'), 'base content');
      spawnSync('git', ['add', 'test.txt'], { cwd: testDir });
      spawnSync('git', ['commit', '-m', 'initial'], { cwd: testDir });

      // Create a branch and modify file
      spawnSync('git', ['checkout', '-b', 'branch1'], { cwd: testDir });
      fs.writeFileSync(path.join(testDir, 'test.txt'), 'branch1 content');
      spawnSync('git', ['commit', '-am', 'branch1 change'], { cwd: testDir });

      // Go back to main and make conflicting change
      spawnSync('git', ['checkout', '-'], { cwd: testDir });
      fs.writeFileSync(path.join(testDir, 'test.txt'), 'main content');
      spawnSync('git', ['commit', '-am', 'main change'], { cwd: testDir });

      // Try to merge - this will create conflicts
      spawnSync('git', ['merge', 'branch1'], { cwd: testDir });

      // Verify conflict exists
      expect(hasUnmergedEntries('test.txt', testDir)).toBe(true);

      // Resolve the conflict
      fs.writeFileSync(path.join(testDir, 'test.txt'), 'resolved content');

      // Stage the resolved file
      const result = stageFile('test.txt', testDir);
      expect(result).toBe(true);

      // Verify conflict is resolved
      expect(hasUnmergedEntries('test.txt', testDir)).toBe(false);
    });
  });
});
