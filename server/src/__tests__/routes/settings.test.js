import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { createApp, generateToken, mockQuery } from "../setup.js";

let app, token;

beforeAll(async () => {
  app = await createApp("../routes/settings.js", "/api/settings");
  token = generateToken();
});

describe("Settings Routes", () => {
  describe("GET /api/settings", () => {
    it("should return all settings as key-value object", async () => {
      mockQuery("SELECT key, value FROM settings", [
        { key: "timeAllocation", value: '{"warmup":10}' },
        { key: "theme", value: '"dark"' },
      ]);

      const res = await request(app)
        .get("/api/settings")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.timeAllocation).toEqual({ warmup: 10 });
      expect(res.body.theme).toBe("dark");
    });

    it("should return empty object when no settings", async () => {
      const res = await request(app)
        .get("/api/settings")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({});
    });

    it("should return 401 without token", async () => {
      const res = await request(app).get("/api/settings");
      expect(res.status).toBe(401);
    });
  });

  describe("PUT /api/settings/:key", () => {
    it("should update an existing setting", async () => {
      mockQuery("SELECT key FROM settings WHERE key", { key: "theme" });
      mockQuery("UPDATE settings", []);

      const res = await request(app)
        .put("/api/settings/theme")
        .set("Authorization", `Bearer ${token}`)
        .send({ value: "dark" });

      expect(res.status).toBe(200);
      expect(res.body.key).toBe("theme");
      expect(res.body.value).toBe("dark");
    });

    it("should create a new setting if not existing", async () => {
      mockQuery("INSERT INTO settings", []);

      const res = await request(app)
        .put("/api/settings/newSetting")
        .set("Authorization", `Bearer ${token}`)
        .send({ value: { custom: true } });

      expect(res.status).toBe(200);
      expect(res.body.key).toBe("newSetting");
    });
  });
});
