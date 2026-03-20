import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { createApp, generateToken, mockQuery } from "../setup.js";

let app, token;

beforeAll(async () => {
  app = await createApp("../routes/sessions.js", "/api/sessions");
  token = generateToken();
});

const SESSION = {
  id: "sess-1",
  date: "2025-01-01",
  planned_duration_min: 60,
  status: "planned",
};

describe("Sessions Routes", () => {
  describe("GET /api/sessions", () => {
    it("should return sessions with blocks", async () => {
      mockQuery("SELECT * FROM practice_sessions ORDER BY", [SESSION]);
      mockQuery("SELECT * FROM session_blocks WHERE session_id", [
        { id: "b1", session_id: "sess-1", category: "warmup" },
      ]);

      const res = await request(app)
        .get("/api/sessions")
        .set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
    });

    it("should return 401 without token", async () => {
      const res = await request(app).get("/api/sessions");
      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/sessions/current", () => {
    it("should return current session", async () => {
      mockQuery("SELECT * FROM practice_sessions WHERE date", SESSION);
      mockQuery("SELECT * FROM session_blocks WHERE session_id", []);

      const res = await request(app)
        .get("/api/sessions/current")
        .set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(200);
    });

    it("should return null when no current session", async () => {
      const res = await request(app)
        .get("/api/sessions/current")
        .set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body).toBeNull();
    });
  });

  describe("GET /api/sessions/rotation/today", () => {
    it("should return today rotation", async () => {
      mockQuery("SELECT rl.*, e.title", [
        { id: "r1", excerpt_id: "exc-1", title: "Test" },
      ]);

      const res = await request(app)
        .get("/api/sessions/rotation/today")
        .set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
    });
  });

  describe("POST /api/sessions/rotation/:rotationId/practiced", () => {
    it("should mark rotation as practiced", async () => {
      mockQuery("SELECT * FROM excerpt_rotation_log WHERE id", {
        id: "r1",
        excerpt_id: "exc-1",
      });
      mockQuery("UPDATE excerpt_rotation_log", []);
      mockQuery("UPDATE excerpts", []);

      const res = await request(app)
        .post("/api/sessions/rotation/r1/practiced")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
    });

    it("should return 404 for missing rotation", async () => {
      const res = await request(app)
        .post("/api/sessions/rotation/nope/practiced")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });

  describe("POST /api/sessions/generate", () => {
    it("should generate a practice session", async () => {
      mockQuery(
        "SELECT value FROM settings WHERE key = 'timeAllocation'",
        null,
      );
      // Fundamentals query
      mockQuery("SELECT e.*, tc.name as category_name FROM exercises", []);
      // Technique query
      mockQuery("SELECT DISTINCT ON", []);
      // Repertoire query
      mockQuery("SELECT s.*, p.title", []);
      // Excerpts query
      mockQuery("SELECT rl.*, e.title", []);
      // Insert session
      mockQuery("INSERT INTO practice_sessions", []);
      // Insert blocks
      mockQuery("INSERT INTO session_blocks", []);
      // Return session
      mockQuery("SELECT * FROM practice_sessions WHERE id", {
        ...SESSION,
        id: "test-uuid-1",
      });
      mockQuery("SELECT * FROM session_blocks WHERE session_id", []);

      const res = await request(app)
        .post("/api/sessions/generate")
        .set("Authorization", `Bearer ${token}`)
        .send({ duration_min: 60 });

      expect(res.status).toBe(201);
    });
  });

  describe("PUT /api/sessions/:id/start", () => {
    it("should start a session", async () => {
      mockQuery("SELECT * FROM practice_sessions WHERE id", SESSION);
      mockQuery("UPDATE practice_sessions", []);
      mockQuery("SELECT id FROM session_blocks WHERE session_id", { id: "b1" });
      mockQuery("UPDATE session_blocks", []);
      mockQuery("SELECT * FROM practice_sessions WHERE id", {
        ...SESSION,
        status: "in_progress",
      });
      mockQuery("SELECT * FROM session_blocks WHERE session_id", []);

      const res = await request(app)
        .put("/api/sessions/sess-1/start")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
    });

    it("should return 404 for missing session", async () => {
      const res = await request(app)
        .put("/api/sessions/nope/start")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });

  describe("PUT /api/sessions/:id/complete", () => {
    it("should complete a session", async () => {
      mockQuery("SELECT * FROM practice_sessions WHERE id", SESSION);
      mockQuery("SELECT * FROM session_blocks WHERE session_id", [
        { planned_duration_min: 10 },
      ]);
      mockQuery("UPDATE practice_sessions", []);
      mockQuery("SELECT * FROM practice_sessions WHERE id", {
        ...SESSION,
        status: "completed",
      });
      mockQuery("SELECT * FROM session_blocks WHERE session_id", []);

      const res = await request(app)
        .put("/api/sessions/sess-1/complete")
        .set("Authorization", `Bearer ${token}`)
        .send({ rating: "good", notes: "Great session" });

      expect(res.status).toBe(200);
    });

    it("should return 404 for missing session", async () => {
      const res = await request(app)
        .put("/api/sessions/nope/complete")
        .set("Authorization", `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(404);
    });
  });

  describe("PUT /api/sessions/:sessionId/blocks/:blockId/complete", () => {
    it("should complete a block", async () => {
      mockQuery("UPDATE session_blocks SET", []);
      mockQuery("SELECT id FROM session_blocks WHERE session_id", null);
      mockQuery("SELECT * FROM practice_sessions WHERE id", SESSION);
      mockQuery("SELECT * FROM session_blocks WHERE session_id", []);

      const res = await request(app)
        .put("/api/sessions/sess-1/blocks/b1/complete")
        .set("Authorization", `Bearer ${token}`)
        .send({ actual_duration_min: 10 });

      expect(res.status).toBe(200);
    });
  });

  describe("PUT /api/sessions/:sessionId/blocks/:blockId/skip", () => {
    it("should skip a block", async () => {
      mockQuery("UPDATE session_blocks SET", []);
      mockQuery("SELECT id FROM session_blocks WHERE session_id", null);
      mockQuery("SELECT * FROM practice_sessions WHERE id", SESSION);
      mockQuery("SELECT * FROM session_blocks WHERE session_id", []);

      const res = await request(app)
        .put("/api/sessions/sess-1/blocks/b1/skip")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
    });
  });

  describe("GET /api/sessions/stats", () => {
    it("should return practice stats", async () => {
      mockQuery("SELECT * FROM practice_sessions WHERE date >= ", [
        { actual_duration_min: 60 },
      ]);
      mockQuery("SELECT DISTINCT date FROM practice_sessions", [
        { date: new Date().toISOString().slice(0, 10) },
      ]);

      const res = await request(app)
        .get("/api/sessions/stats")
        .set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("weekMinutes");
      expect(res.body).toHaveProperty("streak");
    });
  });

  describe("GET /api/sessions/analytics/time-by-category", () => {
    it("should return time by category data", async () => {
      mockQuery("DATE_TRUNC", []);

      const res = await request(app)
        .get("/api/sessions/analytics/time-by-category")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("weeks");
    });
  });

  describe("GET /api/sessions/analytics/trends", () => {
    it("should return trend data", async () => {
      mockQuery("SELECT * FROM practice_sessions WHERE status", []);

      const res = await request(app)
        .get("/api/sessions/analytics/trends")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("current");
      expect(res.body).toHaveProperty("previous");
    });
  });

  describe("GET /api/sessions/analytics/stalled-pieces", () => {
    it("should return stalled pieces", async () => {
      mockQuery("SELECT p.id", []);

      const res = await request(app)
        .get("/api/sessions/analytics/stalled-pieces")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });

  describe("GET /api/sessions/analytics/drift", () => {
    it("should return drift data", async () => {
      mockQuery(
        "SELECT value FROM settings WHERE key = 'timeAllocation'",
        null,
      );
      mockQuery("SELECT sb.category", []);

      const res = await request(app)
        .get("/api/sessions/analytics/drift")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("target");
      expect(res.body).toHaveProperty("hasData");
    });
  });

  describe("GET /api/sessions/analytics/history", () => {
    it("should return paginated history", async () => {
      mockQuery("SELECT COUNT", { total: "0" });
      mockQuery("SELECT * FROM practice_sessions", []);

      const res = await request(app)
        .get("/api/sessions/analytics/history")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("sessions");
      expect(res.body).toHaveProperty("totalPages");
    });
  });
});
