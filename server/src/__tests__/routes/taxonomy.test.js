import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { createApp, generateToken, mockQuery } from "../setup.js";

let app, token;

beforeAll(async () => {
  app = await createApp("../routes/taxonomy.js", "/api/taxonomy");
  token = generateToken();
});

const CATEGORY = {
  id: "cat-1",
  name: "Scales",
  parent_id: null,
  sort_order: 0,
  description: "Scale exercises",
};

describe("Taxonomy Routes", () => {
  describe("GET /api/taxonomy", () => {
    it("should return all categories", async () => {
      mockQuery("SELECT * FROM taxonomy_categories", [CATEGORY]);

      const res = await request(app)
        .get("/api/taxonomy")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
    });

    it("should return 401 without token", async () => {
      const res = await request(app).get("/api/taxonomy");
      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/taxonomy/:id", () => {
    it("should return a single category", async () => {
      mockQuery("SELECT * FROM taxonomy_categories WHERE id", CATEGORY);

      const res = await request(app)
        .get("/api/taxonomy/cat-1")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.name).toBe("Scales");
    });

    it("should return 404 for missing category", async () => {
      const res = await request(app)
        .get("/api/taxonomy/nope")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });

  describe("POST /api/taxonomy", () => {
    it("should create a category", async () => {
      mockQuery("INSERT INTO taxonomy_categories", []);
      mockQuery("SELECT * FROM taxonomy_categories WHERE id", {
        ...CATEGORY,
        id: "test-uuid-1",
      });

      const res = await request(app)
        .post("/api/taxonomy")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Scales" });

      expect(res.status).toBe(201);
    });

    it("should return 400 without name", async () => {
      const res = await request(app)
        .post("/api/taxonomy")
        .set("Authorization", `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe("PUT /api/taxonomy/:id", () => {
    it("should update a category", async () => {
      mockQuery("SELECT * FROM taxonomy_categories WHERE id", CATEGORY);
      mockQuery("UPDATE taxonomy_categories", []);
      mockQuery("SELECT * FROM taxonomy_categories WHERE id", {
        ...CATEGORY,
        name: "Updated",
      });

      const res = await request(app)
        .put("/api/taxonomy/cat-1")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Updated" });

      expect(res.status).toBe(200);
    });

    it("should return 404 for missing category", async () => {
      const res = await request(app)
        .put("/api/taxonomy/nope")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Updated" });

      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /api/taxonomy/:id", () => {
    it("should delete a category", async () => {
      mockQuery("SELECT * FROM taxonomy_categories WHERE id", CATEGORY);
      mockQuery("DELETE FROM taxonomy_categories", []);

      const res = await request(app)
        .delete("/api/taxonomy/cat-1")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.deleted).toBe(true);
    });

    it("should return 404 for missing category", async () => {
      const res = await request(app)
        .delete("/api/taxonomy/nope")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });
});
