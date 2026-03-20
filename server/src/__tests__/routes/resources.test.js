import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { createApp, generateToken, mockQuery } from "../setup.js";

let app, token;

beforeAll(async () => {
  app = await createApp("../routes/resources.js", "/api/resources");
  token = generateToken();
});

const RESOURCE = {
  id: "res-1",
  linked_type: "piece",
  linked_id: "p1",
  resource_type: "score",
  title: "IMSLP Score",
  url: "https://imslp.org/test",
  source: "imslp",
};

describe("Resources Routes", () => {
  describe("GET /api/resources", () => {
    it("should return resources for a linked entity", async () => {
      mockQuery("SELECT * FROM resources WHERE linked_type", [RESOURCE]);

      const res = await request(app)
        .get("/api/resources?linked_type=piece&linked_id=p1")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
    });

    it("should return 400 without linked_type and linked_id", async () => {
      const res = await request(app)
        .get("/api/resources")
        .set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(400);
    });

    it("should return 401 without token", async () => {
      const res = await request(app).get(
        "/api/resources?linked_type=piece&linked_id=p1",
      );
      expect(res.status).toBe(401);
    });
  });

  describe("POST /api/resources", () => {
    it("should create a resource", async () => {
      mockQuery("INSERT INTO resources", []);
      mockQuery("SELECT * FROM resources WHERE id", RESOURCE);

      const res = await request(app)
        .post("/api/resources")
        .set("Authorization", `Bearer ${token}`)
        .send({
          linked_type: "piece",
          linked_id: "p1",
          resource_type: "score",
          title: "IMSLP Score",
          url: "https://imslp.org/test",
          source: "imslp",
        });

      expect(res.status).toBe(201);
    });

    it("should return 400 without required fields", async () => {
      const res = await request(app)
        .post("/api/resources")
        .set("Authorization", `Bearer ${token}`)
        .send({ title: "Missing fields" });

      expect(res.status).toBe(400);
    });
  });

  describe("DELETE /api/resources/:id", () => {
    it("should delete a resource", async () => {
      mockQuery("SELECT id FROM resources WHERE id", { id: "res-1" });
      mockQuery("DELETE FROM resources", []);

      const res = await request(app)
        .delete("/api/resources/res-1")
        .set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.deleted).toBe(true);
    });

    it("should return 404 for missing resource", async () => {
      const res = await request(app)
        .delete("/api/resources/nope")
        .set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(404);
    });
  });

  describe("GET /api/resources/search/imslp", () => {
    it("should return 400 without q param", async () => {
      const res = await request(app)
        .get("/api/resources/search/imslp")
        .set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/resources/search/wikipedia", () => {
    it("should return 400 without q param", async () => {
      const res = await request(app)
        .get("/api/resources/search/wikipedia")
        .set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/resources/search/youtube", () => {
    it("should return 400 without q param", async () => {
      const res = await request(app)
        .get("/api/resources/search/youtube")
        .set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(400);
    });

    it("should return search link without API key", async () => {
      delete process.env.YOUTUBE_API_KEY;
      const res = await request(app)
        .get("/api/resources/search/youtube?q=beethoven")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].url).toContain("youtube.com");
    });
  });

  describe("POST /api/resources/auto-discover", () => {
    it("should return 400 without title", async () => {
      const res = await request(app)
        .post("/api/resources/auto-discover")
        .set("Authorization", `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(400);
    });
  });
});
