import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { createApp, generateToken, mockQuery } from "../setup.js";

let app, token;

beforeAll(async () => {
  app = await createApp("../routes/pieces.js", "/api/pieces");
  token = generateToken();
});

const PIECE = {
  id: "piece-1",
  title: "Sonata",
  composer: "Mozart",
  status: "not_started",
  priority: "medium",
  general_notes: "",
};

describe("Pieces Routes", () => {
  // ── GET / ──
  describe("GET /api/pieces", () => {
    it("should return all pieces with sections and demands", async () => {
      mockQuery("SELECT * FROM pieces ORDER BY", [PIECE]);
      mockQuery("SELECT * FROM sections WHERE piece_id", [
        { id: "s1", piece_id: "piece-1", name: "Mvt 1" },
      ]);
      mockQuery("SELECT * FROM technical_demands WHERE piece_id", []);

      const res = await request(app)
        .get("/api/pieces")
        .set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].sections).toHaveLength(1);
    });

    it("should return empty array when no pieces", async () => {
      const res = await request(app)
        .get("/api/pieces")
        .set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it("should return 401 without token", async () => {
      const res = await request(app).get("/api/pieces");
      expect(res.status).toBe(401);
    });
  });

  // ── GET /:id ──
  describe("GET /api/pieces/:id", () => {
    it("should return a piece with full details", async () => {
      mockQuery("SELECT * FROM pieces WHERE id", PIECE);
      mockQuery("SELECT * FROM sections WHERE piece_id", []);
      mockQuery("SELECT td.*, tc.name", []);

      const res = await request(app)
        .get("/api/pieces/piece-1")
        .set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.title).toBe("Sonata");
    });

    it("should return 404 for non-existent piece", async () => {
      const res = await request(app)
        .get("/api/pieces/nope")
        .set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(404);
    });
  });

  // ── POST / ──
  describe("POST /api/pieces", () => {
    it("should create a piece", async () => {
      mockQuery("INSERT INTO pieces", []);
      mockQuery("SELECT * FROM pieces WHERE id", {
        ...PIECE,
        id: "test-uuid-1",
      });

      const res = await request(app)
        .post("/api/pieces")
        .set("Authorization", `Bearer ${token}`)
        .send({ title: "Sonata" });

      expect(res.status).toBe(201);
      expect(res.body.sections).toEqual([]);
    });

    it("should return 400 without title", async () => {
      const res = await request(app)
        .post("/api/pieces")
        .set("Authorization", `Bearer ${token}`)
        .send({ composer: "Bach" });

      expect(res.status).toBe(400);
    });
  });

  // ── PUT /:id ──
  describe("PUT /api/pieces/:id", () => {
    it("should update a piece", async () => {
      mockQuery("SELECT * FROM pieces WHERE id", PIECE);
      mockQuery("UPDATE pieces", []);
      mockQuery("SELECT * FROM pieces WHERE id", {
        ...PIECE,
        title: "Updated",
      });

      const res = await request(app)
        .put("/api/pieces/piece-1")
        .set("Authorization", `Bearer ${token}`)
        .send({ title: "Updated" });

      expect(res.status).toBe(200);
    });

    it("should return 404 for non-existent piece", async () => {
      const res = await request(app)
        .put("/api/pieces/nope")
        .set("Authorization", `Bearer ${token}`)
        .send({ title: "Updated" });

      expect(res.status).toBe(404);
    });
  });

  // ── DELETE /:id ──
  describe("DELETE /api/pieces/:id", () => {
    it("should delete a piece", async () => {
      mockQuery("SELECT id FROM pieces WHERE id", { id: "piece-1" });
      mockQuery("SELECT id FROM sections", []);
      mockQuery("DELETE FROM session_blocks", []);
      mockQuery("DELETE FROM resources", []);
      mockQuery("DELETE FROM pieces", []);

      const res = await request(app)
        .delete("/api/pieces/piece-1")
        .set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.deleted).toBe(true);
    });

    it("should return 404 for non-existent piece", async () => {
      const res = await request(app)
        .delete("/api/pieces/nope")
        .set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(404);
    });
  });

  // ── Sections ──
  describe("POST /api/pieces/:pieceId/sections", () => {
    it("should create a section", async () => {
      mockQuery("SELECT id FROM pieces WHERE id", { id: "piece-1" });
      mockQuery("INSERT INTO sections", []);
      mockQuery("SELECT * FROM sections WHERE id", {
        id: "test-uuid-1",
        name: "Mvt 1",
      });

      const res = await request(app)
        .post("/api/pieces/piece-1/sections")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Mvt 1" });

      expect(res.status).toBe(201);
    });

    it("should return 400 without name", async () => {
      mockQuery("SELECT id FROM pieces WHERE id", { id: "piece-1" });

      const res = await request(app)
        .post("/api/pieces/piece-1/sections")
        .set("Authorization", `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(400);
    });

    it("should return 404 if piece not found", async () => {
      const res = await request(app)
        .post("/api/pieces/nope/sections")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Mvt 1" });

      expect(res.status).toBe(404);
    });
  });

  describe("PUT /api/pieces/:pieceId/sections/:sectionId", () => {
    it("should return 404 for non-existent section", async () => {
      const res = await request(app)
        .put("/api/pieces/piece-1/sections/nope")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Updated" });

      expect(res.status).toBe(404);
    });
  });

  // ── Technical Demands ──
  describe("POST /api/pieces/:pieceId/demands", () => {
    it("should create a demand", async () => {
      mockQuery("SELECT id FROM pieces WHERE id", { id: "piece-1" });
      mockQuery("INSERT INTO technical_demands", []);
      mockQuery("SELECT * FROM technical_demands WHERE id", {
        id: "test-uuid-1",
        description: "Trills",
      });

      const res = await request(app)
        .post("/api/pieces/piece-1/demands")
        .set("Authorization", `Bearer ${token}`)
        .send({ description: "Trills" });

      expect(res.status).toBe(201);
      expect(res.body.linked_exercises).toEqual([]);
    });

    it("should return 400 without description", async () => {
      mockQuery("SELECT id FROM pieces WHERE id", { id: "piece-1" });

      const res = await request(app)
        .post("/api/pieces/piece-1/demands")
        .set("Authorization", `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe("POST /api/pieces/:pieceId/demands/:demandId/exercises", () => {
    it("should link an exercise to a demand", async () => {
      mockQuery("INSERT INTO demand_exercises", []);

      const res = await request(app)
        .post("/api/pieces/piece-1/demands/demand-1/exercises")
        .set("Authorization", `Bearer ${token}`)
        .send({ exercise_id: "ex-1" });

      expect(res.status).toBe(200);
      expect(res.body.linked).toBe(true);
    });

    it("should return 400 without exercise_id", async () => {
      const res = await request(app)
        .post("/api/pieces/piece-1/demands/demand-1/exercises")
        .set("Authorization", `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(400);
    });
  });
});
