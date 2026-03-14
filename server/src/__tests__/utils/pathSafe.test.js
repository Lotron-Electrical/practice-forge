import { describe, it, expect, vi } from 'vitest';

// Undo global mock from setup.js so we test the real implementation
vi.unmock('../../utils/pathSafe.js');

import { safePath, DATA_DIR } from '../../utils/pathSafe.js';
import path from 'path';

describe('utils/pathSafe', () => {
  describe('safePath', () => {
    it('resolves a normal filename within DATA_DIR', () => {
      const result = safePath('test.pdf');
      expect(result).toBe(path.resolve(DATA_DIR, 'test.pdf'));
      expect(result.startsWith(DATA_DIR)).toBe(true);
    });

    it('resolves a subdirectory path within DATA_DIR', () => {
      const result = safePath('uploads/photo.jpg');
      expect(result.startsWith(DATA_DIR)).toBe(true);
      expect(result).toBe(path.resolve(DATA_DIR, 'uploads', 'photo.jpg'));
    });

    it('blocks ../ traversal attempts', () => {
      expect(() => safePath('../../../etc/passwd')).toThrow('Access denied');
    });

    it('blocks deeply nested traversal', () => {
      expect(() => safePath('a/b/../../../../secret')).toThrow('Access denied');
    });

    it('blocks absolute paths outside DATA_DIR', () => {
      expect(() => safePath('/etc/passwd')).toThrow('Access denied');
    });

    it('blocks Windows-style absolute paths', () => {
      // On Windows path.resolve of C:\\... would not start with DATA_DIR
      expect(() => safePath('C:\\Windows\\System32\\config')).toThrow('Access denied');
    });

    it('throws with status 403', () => {
      try {
        safePath('../../../etc/passwd');
      } catch (e) {
        expect(e.status).toBe(403);
        expect(e.message).toBe('Access denied');
      }
    });

    it('allows nested valid paths', () => {
      const result = safePath('user1/recordings/session1/track.wav');
      expect(result.startsWith(DATA_DIR)).toBe(true);
    });
  });

  describe('DATA_DIR', () => {
    it('is an absolute path', () => {
      expect(path.isAbsolute(DATA_DIR)).toBe(true);
    });
  });
});
