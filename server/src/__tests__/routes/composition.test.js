import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import request from "supertest";
import { createApp, generateToken, mockQuery } from "../setup.js";

let app, token;

beforeAll(async () => {
  app = await createApp("../routes/composition.js", "/api/composition");
  token = generateToken();
});

describe("Composition Routes", () => {
  describe("POST /api/composition/generate/rule", () => {
    it("should generate a scale exercise", async () => {
      const res = await request(app)
        .post("/api/composition/generate/rule")
        .set("Authorization", `Bearer ${token}`)
        .send({ type: "scale", params: { key: "D" } });

      expect(res.status).toBe(200);
      expect(res.body.title).toContain("Scale");
    });

    it("should generate an arpeggio exercise", async () => {
      const res = await request(app)
        .post("/api/composition/generate/rule")
        .set("Authorization", `Bearer ${token}`)
        .send({ type: "arpeggio", params: { key: "C" } });

      expect(res.status).toBe(200);
    });

    it("should return 400 without type", async () => {
      const res = await request(app)
        .post("/api/composition/generate/rule")
        .set("Authorization", `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(400);
    });

    it("should return 400 for unknown type", async () => {
      const res = await request(app)
        .post("/api/composition/generate/rule")
        .set("Authorization", `Bearer ${token}`)
        .send({ type: "unknown" });

      expect(res.status).toBe(400);
    });

    it("should return 401 without token", async () => {
      const res = await request(app)
        .post("/api/composition/generate/rule")
        .send({ type: "scale" });

      expect(res.status).toBe(401);
    });
  });

  describe("POST /api/composition/generate/from-demand", () => {
    it("should return 404 for missing demand_id", async () => {
      const res = await request(app)
        .post("/api/composition/generate/from-demand")
        .set("Authorization", `Bearer ${token}`)
        .send({ demand_id: "nope" });

      expect(res.status).toBe(404);
    });

    it("should attempt generation from demand body", async () => {
      // generateFromDemand returns null, falls back to AI
      process.env.ANTHROPIC_API_KEY = "test-key";
      const res = await request(app)
        .post("/api/composition/generate/from-demand")
        .set("Authorization", `Bearer ${token}`)
        .send({ description: "Trill exercise" });

      expect(res.status).toBe(200);
      delete process.env.ANTHROPIC_API_KEY;
    });
  });

  describe("POST /api/composition/generate/ai", () => {
    it("should return cost estimate when not confirmed", async () => {
      process.env.ANTHROPIC_API_KEY = "test-key";
      const res = await request(app)
        .post("/api/composition/generate/ai")
        .set("Authorization", `Bearer ${token}`)
        .send({ type: "scale", prompt: "C major scale" });

      expect(res.status).toBe(200);
      expect(res.body.requires_confirmation).toBe(true);
      delete process.env.ANTHROPIC_API_KEY;
    });

    it("should return 400 without type or prompt", async () => {
      const res = await request(app)
        .post("/api/composition/generate/ai")
        .set("Authorization", `Bearer ${token}`)
        .send({ type: "scale" });

      expect(res.status).toBe(400);
    });

    it("should return 400 without API key", async () => {
      delete process.env.ANTHROPIC_API_KEY;
      const res = await request(app)
        .post("/api/composition/generate/ai")
        .set("Authorization", `Bearer ${token}`)
        .send({ type: "scale", prompt: "test" });

      expect(res.status).toBe(400);
    });
  });

  describe("POST /api/composition/generate/save", () => {
    it("should save a generated exercise", async () => {
      mockQuery("INSERT INTO exercises", []);
      mockQuery("SELECT e.*, tc.name", {
        id: "test-uuid-1",
        title: "Saved Ex",
      });

      const res = await request(app)
        .post("/api/composition/generate/save")
        .set("Authorization", `Bearer ${token}`)
        .send({ title: "Saved Ex", abc: "X:1\nK:C\nCDEF|" });

      expect(res.status).toBe(201);
    });

    it("should return 400 without title or abc", async () => {
      const res = await request(app)
        .post("/api/composition/generate/save")
        .set("Authorization", `Bearer ${token}`)
        .send({ title: "No ABC" });

      expect(res.status).toBe(400);
    });
  });

  describe("POST /api/composition/generate/excerpt-prep", () => {
    it("should return 404 for missing excerpt", async () => {
      const res = await request(app)
        .post("/api/composition/generate/excerpt-prep")
        .set("Authorization", `Bearer ${token}`)
        .send({ excerpt_id: "nope" });

      expect(res.status).toBe(404);
    });

    it("should return cost estimate when not confirmed", async () => {
      process.env.ANTHROPIC_API_KEY = "test-key";
      mockQuery("SELECT * FROM excerpts WHERE id", {
        id: "exc-1",
        title: "Test",
        composer: "Bach",
      });

      const res = await request(app)
        .post("/api/composition/generate/excerpt-prep")
        .set("Authorization", `Bearer ${token}`)
        .send({ excerpt_id: "exc-1" });

      expect(res.status).toBe(200);
      expect(res.body.requires_confirmation).toBe(true);
      delete process.env.ANTHROPIC_API_KEY;
    });
  });

  describe("POST /api/composition/generate/warmup", () => {
    it("should return 400 without API key", async () => {
      delete process.env.ANTHROPIC_API_KEY;
      const res = await request(app)
        .post("/api/composition/generate/warmup")
        .set("Authorization", `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(400);
    });

    it("should return cost estimate when not confirmed", async () => {
      process.env.ANTHROPIC_API_KEY = "test-key";
      const res = await request(app)
        .post("/api/composition/generate/warmup")
        .set("Authorization", `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.requires_confirmation).toBe(true);
      delete process.env.ANTHROPIC_API_KEY;
    });
  });
});
