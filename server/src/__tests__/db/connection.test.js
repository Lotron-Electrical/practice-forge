import { describe, it, expect, vi, beforeEach } from "vitest";

// Unmock connection.js and fs so we test real code, but keep pg mocked
vi.unmock("../../db/connection.js");
vi.unmock("fs");

// Override the global pg mock with one we can inspect
const mockClient = {
  query: vi.fn().mockResolvedValue({}),
  release: vi.fn(),
};

const mockPool = {
  connect: vi.fn().mockResolvedValue(mockClient),
  query: vi.fn().mockResolvedValue({}),
};

vi.mock("pg", () => {
  const PoolConstructor = vi.fn(function () {
    return mockPool;
  });
  return {
    default: { Pool: PoolConstructor },
    Pool: PoolConstructor,
  };
});

// Mock fs.readFileSync to return dummy SQL without reading real files
vi.mock("fs", () => ({
  default: {
    readFileSync: vi.fn().mockReturnValue("SELECT 1;"),
  },
  readFileSync: vi.fn().mockReturnValue("SELECT 1;"),
}));

describe("db/connection", () => {
  beforeEach(() => {
    vi.resetModules();
    mockClient.query.mockClear();
    mockClient.release.mockClear();
    mockPool.connect.mockClear().mockResolvedValue(mockClient);
    mockPool.query.mockClear().mockResolvedValue({});
  });

  describe("initDatabase", () => {
    it("creates a Pool and tests the connection", async () => {
      process.env.DATABASE_URL = "postgresql://test:pass@localhost:5432/testdb";

      const { initDatabase } = await import("../../db/connection.js");
      await initDatabase();

      expect(mockPool.connect).toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalledWith("SELECT 1");
      expect(mockClient.release).toHaveBeenCalled();
    });

    it("runs schema and seed SQL files", async () => {
      process.env.DATABASE_URL = "postgresql://test:pass@localhost:5432/testdb";

      const { initDatabase } = await import("../../db/connection.js");
      await initDatabase();

      // pool.query called twice: once for schema, once for seed
      expect(mockPool.query).toHaveBeenCalledTimes(2);
    });

    it("returns the pool instance", async () => {
      process.env.DATABASE_URL = "postgresql://test:pass@localhost:5432/testdb";

      const { initDatabase } = await import("../../db/connection.js");
      const pool = await initDatabase();

      expect(pool).toBe(mockPool);
    });
  });

  describe("getPool", () => {
    it("throws if database not initialized", async () => {
      const { getPool } = await import("../../db/connection.js");

      expect(() => getPool()).toThrow("Database not initialized");
    });

    it("returns pool after initialization", async () => {
      process.env.DATABASE_URL = "postgresql://test:pass@localhost:5432/testdb";

      const { initDatabase, getPool } = await import("../../db/connection.js");
      await initDatabase();

      expect(getPool()).toBe(mockPool);
    });
  });
});
