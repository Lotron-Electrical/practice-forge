import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the connection module before importing helpers
vi.mock('../../db/connection.js', () => {
  const mockPool = {
    query: vi.fn(),
  };
  return {
    getPool: vi.fn(() => mockPool),
    __mockPool: mockPool,
  };
});

const { getPool } = await import('../../db/connection.js');
const { queryAll, queryOne, execute } = await import('../../db/helpers.js');

describe('db/helpers', () => {
  let mockPool;

  beforeEach(() => {
    mockPool = getPool();
    mockPool.query.mockReset();
  });

  describe('queryAll', () => {
    it('returns all rows from a SELECT query', async () => {
      const rows = [{ id: '1', name: 'Alice' }, { id: '2', name: 'Bob' }];
      mockPool.query.mockResolvedValue({ rows });

      const result = await queryAll('SELECT * FROM users');
      expect(result).toEqual(rows);
      expect(mockPool.query).toHaveBeenCalledWith('SELECT * FROM users', []);
    });

    it('passes params to pool.query', async () => {
      mockPool.query.mockResolvedValue({ rows: [{ id: '1' }] });

      await queryAll('SELECT * FROM users WHERE id = $1', ['abc']);
      expect(mockPool.query).toHaveBeenCalledWith('SELECT * FROM users WHERE id = $1', ['abc']);
    });

    it('returns empty array when no rows', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await queryAll('SELECT * FROM users WHERE 1=0');
      expect(result).toEqual([]);
    });

    it('propagates query errors', async () => {
      mockPool.query.mockRejectedValue(new Error('syntax error'));

      await expect(queryAll('INVALID SQL')).rejects.toThrow('syntax error');
    });
  });

  describe('queryOne', () => {
    it('returns the first row', async () => {
      const rows = [{ id: '1', name: 'Alice' }, { id: '2', name: 'Bob' }];
      mockPool.query.mockResolvedValue({ rows });

      const result = await queryOne('SELECT * FROM users LIMIT 1');
      expect(result).toEqual({ id: '1', name: 'Alice' });
    });

    it('returns null when no rows', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await queryOne('SELECT * FROM users WHERE id = $1', ['nonexistent']);
      expect(result).toBeNull();
    });

    it('passes params through', async () => {
      mockPool.query.mockResolvedValue({ rows: [{ id: '5' }] });

      await queryOne('SELECT * FROM users WHERE id = $1', ['5']);
      expect(mockPool.query).toHaveBeenCalledWith('SELECT * FROM users WHERE id = $1', ['5']);
    });
  });

  describe('execute', () => {
    it('returns rowCount for INSERT', async () => {
      mockPool.query.mockResolvedValue({ rowCount: 1 });

      const result = await execute('INSERT INTO users (id) VALUES ($1)', ['abc']);
      expect(result).toBe(1);
    });

    it('returns rowCount for UPDATE affecting multiple rows', async () => {
      mockPool.query.mockResolvedValue({ rowCount: 3 });

      const result = await execute('UPDATE users SET name = $1', ['test']);
      expect(result).toBe(3);
    });

    it('returns 0 for DELETE matching nothing', async () => {
      mockPool.query.mockResolvedValue({ rowCount: 0 });

      const result = await execute('DELETE FROM users WHERE id = $1', ['nonexistent']);
      expect(result).toBe(0);
    });

    it('uses empty params array by default', async () => {
      mockPool.query.mockResolvedValue({ rowCount: 5 });

      await execute('DELETE FROM old_sessions');
      expect(mockPool.query).toHaveBeenCalledWith('DELETE FROM old_sessions', []);
    });

    it('propagates errors', async () => {
      mockPool.query.mockRejectedValue(new Error('FK violation'));

      await expect(execute('INSERT INTO bad_ref VALUES ($1)', ['x'])).rejects.toThrow('FK violation');
    });
  });
});
