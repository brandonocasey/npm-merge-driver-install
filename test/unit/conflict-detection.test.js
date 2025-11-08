import { describe, expect, it } from 'vitest';
import { hasConflictMarkers } from '../../src/utils/conflict-detection.js';

// biome-ignore lint/security/noSecrets: False positive - this is a function name, not a secret
describe('hasConflictMarkers', () => {
  it('returns true for content with all three conflict markers', () => {
    const content = `{
  "name": "test",
<<<<<<< HEAD
  "version": "1.0.0"
=======
  "version": "2.0.0"
>>>>>>> branch
}`;
    expect(hasConflictMarkers(content)).toBe(true);
  });

  it('returns false for content with no conflict markers', () => {
    const content = '{ "name": "test", "version": "1.0.0" }';
    expect(hasConflictMarkers(content)).toBe(false);
  });

  it('returns false if only one marker is present', () => {
    const content = '<<<<<<< HEAD\n{ "name": "test" }';
    expect(hasConflictMarkers(content)).toBe(false);
  });

  it('returns false if only two markers are present', () => {
    const content = '<<<<<<< HEAD\n{ "name": "test" }\n=======';
    expect(hasConflictMarkers(content)).toBe(false);
  });

  it('returns true with markers in any order', () => {
    const content = 'some text\n>>>>>>> branch\nmore text\n<<<<<<< HEAD\neven more\n=======\nend';
    expect(hasConflictMarkers(content)).toBe(true);
  });

  it('handles empty string', () => {
    expect(hasConflictMarkers('')).toBe(false);
  });

  it('handles multiline conflicts', () => {
    const content = `line 1
line 2
<<<<<<< HEAD
line 3a
line 4a
=======
line 3b
line 4b
>>>>>>> branch
line 5`;
    expect(hasConflictMarkers(content)).toBe(true);
  });
});
