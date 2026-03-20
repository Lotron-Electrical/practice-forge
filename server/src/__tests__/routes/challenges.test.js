import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { createApp, generateToken, mockQuery } from "../setup.js";

let app, token;

beforeAll(async () => {
  app = await createApp("../routes/challenges.js", "/api/challenges");
  token = generateToken();
});

const CHALLENGE = {
  id: "ch-1",
  creator_id: "test-user-id",
  type: "duel",
  status: "active",
};

describe("Challenges Routes", () => {
  describe("POST /api/challenges", () => {
    it("should create a challenge", async () => {
      mockQuery("INSERT INTO challenges", []);
      mockQuery("INSERT INTO challenge_participants", []);
      mockQuery("SELECT * FROM challenges WHERE id", {
        ...CHALLENGE,
        id: "test-uuid-1",
      });
      mockQuery("SELECT cp.*, u.display_name", [
        { user_id: "test-user-id", display_name: "Test", status: "accepted" },
      ]);

      const res = await request(app)
        .post("/api/challenges")
        .set("Authorization", `Bearer ${token}`)
        .send({ type: "duel" });

      expect(res.status).toBe(201);
      expect(res.body.participants).toHaveLength(1);
    });

    it("should return 400 without type", async () => {
      const res = await request(app)
        .post("/api/challenges")
        .set("Authorization", `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(400);
    });

    it("should return 401 without token", async () => {
      const res = await request(app)
        .post("/api/challenges")
        .send({ type: "duel" });
      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/challenges", () => {
    it("should return challenges for current user", async () => {
      mockQuery("SELECT DISTINCT c.*", [CHALLENGE]);
      mockQuery("SELECT cp.*, u.display_name", []);

      const res = await request(app)
        .get("/api/challenges")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
    });
  });

  describe("GET /api/challenges/:id", () => {
    it("should return challenge with participants", async () => {
      mockQuery("SELECT * FROM challenges WHERE id", CHALLENGE);
      mockQuery("SELECT cp.*, u.display_name", []);

      const res = await request(app)
        .get("/api/challenges/ch-1")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
    });

    it("should return 404 for missing challenge", async () => {
      const res = await request(app)
        .get("/api/challenges/nope")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });

  describe("PUT /api/challenges/:id/cancel", () => {
    it("should cancel a challenge (creator only)", async () => {
      mockQuery("SELECT * FROM challenges WHERE id", CHALLENGE);
      mockQuery("UPDATE challenges", []);
      mockQuery("SELECT * FROM challenges WHERE id", {
        ...CHALLENGE,
        status: "cancelled",
      });

      const res = await request(app)
        .put("/api/challenges/ch-1/cancel")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
    });

    it("should return 403 for non-creator", async () => {
      mockQuery("SELECT * FROM challenges WHERE id", {
        ...CHALLENGE,
        creator_id: "other-user",
      });

      const res = await request(app)
        .put("/api/challenges/ch-1/cancel")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(403);
    });

    it("should return 404 for missing challenge", async () => {
      const res = await request(app)
        .put("/api/challenges/nope/cancel")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });

  describe("PUT /api/challenges/:id/accept", () => {
    it("should accept an invitation", async () => {
      mockQuery("SELECT * FROM challenge_participants WHERE challenge_id", {
        id: "cp1",
        status: "invited",
      });
      mockQuery("UPDATE challenge_participants", []);
      mockQuery(
        "SELECT id FROM challenge_participants WHERE challenge_id",
        null,
      );
      mockQuery("UPDATE challenges", []);
      mockQuery("SELECT * FROM challenges WHERE id", {
        ...CHALLENGE,
        status: "active",
      });

      const res = await request(app)
        .put("/api/challenges/ch-1/accept")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
    });

    it("should return 404 when no pending invitation", async () => {
      const res = await request(app)
        .put("/api/challenges/ch-1/accept")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });

  describe("PUT /api/challenges/:id/decline", () => {
    it("should decline an invitation", async () => {
      mockQuery("SELECT * FROM challenge_participants WHERE challenge_id", {
        id: "cp1",
        status: "invited",
      });
      mockQuery("UPDATE challenge_participants", []);
      mockQuery("SELECT * FROM challenges WHERE id", CHALLENGE);

      const res = await request(app)
        .put("/api/challenges/ch-1/decline")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
    });

    it("should return 404 when no pending invitation", async () => {
      const res = await request(app)
        .put("/api/challenges/ch-1/decline")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });

  describe("PUT /api/challenges/:id/submit", () => {
    it("should submit to a challenge", async () => {
      mockQuery("SELECT * FROM challenge_participants WHERE challenge_id", {
        id: "cp1",
        status: "accepted",
      });
      mockQuery("UPDATE challenge_participants SET", []);
      mockQuery(
        "SELECT id FROM challenge_participants WHERE challenge_id",
        null,
      );
      // All submitted - ranking
      mockQuery("SELECT cp.*, u.display_name FROM challenge_participants", [
        { id: "cp1", user_id: "test-user-id", display_name: "Test", score: 90 },
      ]);
      mockQuery("UPDATE challenge_participants SET rank", []);
      mockQuery("UPDATE challenges SET status", []);
      mockQuery("INSERT INTO feed_events", []);
      mockQuery("SELECT * FROM challenges WHERE id", {
        ...CHALLENGE,
        status: "completed",
      });
      mockQuery("SELECT cp.*, u.display_name", []);

      const res = await request(app)
        .put("/api/challenges/ch-1/submit")
        .set("Authorization", `Bearer ${token}`)
        .send({ score: 90 });

      expect(res.status).toBe(200);
    });

    it("should return 404 when not a participant", async () => {
      const res = await request(app)
        .put("/api/challenges/ch-1/submit")
        .set("Authorization", `Bearer ${token}`)
        .send({ score: 90 });

      expect(res.status).toBe(404);
    });
  });

  describe("POST /api/challenges/weekly/generate", () => {
    it("should generate a weekly challenge", async () => {
      mockQuery("SELECT * FROM excerpts ORDER BY RANDOM", {
        id: "exc-1",
        title: "Test",
        composer: "Bach",
      });
      mockQuery("INSERT INTO challenges", []);
      mockQuery("INSERT INTO challenge_participants", []);
      mockQuery("SELECT * FROM challenges WHERE id", {
        id: "test-uuid-1",
        type: "weekly",
        status: "active",
      });
      mockQuery("SELECT cp.*, u.display_name", []);

      const res = await request(app)
        .post("/api/challenges/weekly/generate")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(201);
    });
  });
});
