import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { createApp, generateToken, mockQuery } from "../setup.js";

let app, token;

beforeAll(async () => {
  app = await createApp("../routes/community.js", "/api/community");
  token = generateToken();
});

describe("Community Routes", () => {
  describe("POST /api/community/follow/:userId", () => {
    it("should follow a user", async () => {
      mockQuery("SELECT id FROM follows WHERE follower_id", null);
      mockQuery("INSERT INTO follows", []);

      const res = await request(app)
        .post("/api/community/follow/other-user")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("follower_id");
    });

    it("should return 400 when following self", async () => {
      const selfToken = generateToken({ id: "self-id" });

      const res = await request(app)
        .post("/api/community/follow/self-id")
        .set("Authorization", `Bearer ${selfToken}`);

      expect(res.status).toBe(400);
    });

    it("should return 409 when already following", async () => {
      mockQuery("SELECT id FROM follows WHERE follower_id", { id: "existing" });

      const res = await request(app)
        .post("/api/community/follow/other-user")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(409);
    });

    it("should return 401 without token", async () => {
      const res = await request(app).post("/api/community/follow/other-user");
      expect(res.status).toBe(401);
    });
  });

  describe("DELETE /api/community/follow/:userId", () => {
    it("should unfollow a user", async () => {
      mockQuery("DELETE FROM follows", []);

      const res = await request(app)
        .delete("/api/community/follow/other-user")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.unfollowed).toBe(true);
    });
  });

  describe("GET /api/community/followers", () => {
    it("should return followers", async () => {
      mockQuery("SELECT u.id, u.display_name", [
        { id: "u1", display_name: "Fan" },
      ]);

      const res = await request(app)
        .get("/api/community/followers")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
    });
  });

  describe("GET /api/community/following", () => {
    it("should return following", async () => {
      mockQuery("SELECT u.id, u.display_name", []);

      const res = await request(app)
        .get("/api/community/following")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
    });
  });

  describe("GET /api/community/feed", () => {
    it("should return feed events", async () => {
      mockQuery("SELECT fe.*, u.display_name", []);

      const res = await request(app)
        .get("/api/community/feed")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
    });
  });

  describe("GET /api/community/users/search", () => {
    it("should search users", async () => {
      mockQuery("SELECT id, display_name", [
        { id: "u1", display_name: "Test" },
      ]);

      const res = await request(app)
        .get("/api/community/users/search?q=test")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
    });

    it("should return empty for blank query", async () => {
      const res = await request(app)
        .get("/api/community/users/search?q=")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });

  describe("GET /api/community/users/:id", () => {
    it("should return public profile", async () => {
      mockQuery("SELECT id, display_name", {
        id: "u1",
        display_name: "Public User",
        instrument: "Flute",
        level: "student",
        privacy_settings: { profile_visible: true, stats_visible: true },
      });
      mockQuery("SELECT a.* FROM achievements", []);
      mockQuery("SELECT COUNT", { total_sessions: "10", total_minutes: "600" });

      const res = await request(app)
        .get("/api/community/users/u1")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.display_name).toBe("Public User");
    });

    it("should return 404 for non-existent user", async () => {
      const res = await request(app)
        .get("/api/community/users/nope")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(404);
    });

    it("should return 403 for private profile", async () => {
      mockQuery("SELECT id, display_name", {
        id: "u2",
        display_name: "Private User",
        privacy_settings: { profile_visible: false },
      });

      const res = await request(app)
        .get("/api/community/users/u2")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(403);
    });
  });
});
