import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { createApp, generateToken, mockQuery } from "../setup.js";

let app, token;

beforeAll(async () => {
  app = await createApp(
    "../routes/communityExcerpts.js",
    "/api/community-excerpts",
  );
  token = generateToken();
});

describe("Community Excerpts Routes", () => {
  describe("GET /api/community-excerpts", () => {
    it("should return excerpts with community data", async () => {
      mockQuery("SELECT e.*", [
        {
          id: "e1",
          title: "Test",
          avg_difficulty: 5,
          rating_count: 3,
          note_count: 1,
        },
      ]);

      const res = await request(app)
        .get("/api/community-excerpts")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
    });

    it("should return 401 without token", async () => {
      const res = await request(app).get("/api/community-excerpts");
      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/community-excerpts/:id/community", () => {
    it("should return community data for an excerpt", async () => {
      mockQuery("SELECT COALESCE(AVG", {
        avg_difficulty: 5,
        rating_count: "3",
      });
      mockQuery("SELECT ecn.*, u.display_name", []);
      mockQuery(
        "SELECT difficulty_rating FROM excerpt_community_ratings",
        null,
      );

      const res = await request(app)
        .get("/api/community-excerpts/e1/community")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("avg_difficulty");
      expect(res.body).toHaveProperty("notes");
      expect(res.body.user_rating).toBeNull();
    });
  });

  describe("POST /api/community-excerpts/:id/rate", () => {
    it("should upsert a difficulty rating", async () => {
      mockQuery("INSERT INTO excerpt_community_ratings", []);

      const res = await request(app)
        .post("/api/community-excerpts/e1/rate")
        .set("Authorization", `Bearer ${token}`)
        .send({ difficulty_rating: 7 });

      expect(res.status).toBe(200);
      expect(res.body.difficulty_rating).toBe(7);
    });

    it("should return 400 for invalid rating", async () => {
      const res = await request(app)
        .post("/api/community-excerpts/e1/rate")
        .set("Authorization", `Bearer ${token}`)
        .send({ difficulty_rating: 15 });

      expect(res.status).toBe(400);
    });

    it("should return 400 for missing rating", async () => {
      const res = await request(app)
        .post("/api/community-excerpts/e1/rate")
        .set("Authorization", `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe("POST /api/community-excerpts/:id/notes", () => {
    it("should add a note", async () => {
      mockQuery("INSERT INTO excerpt_community_notes", []);
      mockQuery("SELECT * FROM excerpt_community_notes WHERE id", {
        id: "test-uuid-1",
        note: "Great excerpt",
      });

      const res = await request(app)
        .post("/api/community-excerpts/e1/notes")
        .set("Authorization", `Bearer ${token}`)
        .send({ note: "Great excerpt" });

      expect(res.status).toBe(201);
    });

    it("should return 400 for empty note", async () => {
      const res = await request(app)
        .post("/api/community-excerpts/e1/notes")
        .set("Authorization", `Bearer ${token}`)
        .send({ note: "" });

      expect(res.status).toBe(400);
    });
  });

  describe("DELETE /api/community-excerpts/notes/:noteId", () => {
    it("should delete own note", async () => {
      mockQuery("SELECT * FROM excerpt_community_notes WHERE id", {
        id: "n1",
        user_id: "test-user-id",
      });
      mockQuery("DELETE FROM excerpt_community_notes", []);

      const res = await request(app)
        .delete("/api/community-excerpts/notes/n1")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.deleted).toBe(true);
    });

    it("should return 404 for missing note", async () => {
      const res = await request(app)
        .delete("/api/community-excerpts/notes/nope")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(404);
    });

    it("should return 403 for another user note", async () => {
      mockQuery("SELECT * FROM excerpt_community_notes WHERE id", {
        id: "n1",
        user_id: "other-user",
      });

      const res = await request(app)
        .delete("/api/community-excerpts/notes/n1")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(403);
    });
  });

  describe("POST /api/community-excerpts/notes/:noteId/upvote", () => {
    it("should upvote a note", async () => {
      mockQuery("SELECT id FROM excerpt_community_notes WHERE id", {
        id: "n1",
      });
      mockQuery("UPDATE excerpt_community_notes SET upvotes", []);
      mockQuery("SELECT * FROM excerpt_community_notes WHERE id", {
        id: "n1",
        upvotes: 2,
      });

      const res = await request(app)
        .post("/api/community-excerpts/notes/n1/upvote")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
    });

    it("should return 404 for missing note", async () => {
      const res = await request(app)
        .post("/api/community-excerpts/notes/nope/upvote")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });
});
