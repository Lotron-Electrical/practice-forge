import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import {
  createApp,
  generateToken,
  mockQuery,
  mockQueryOnce,
} from "../setup.js";

let app;

beforeAll(async () => {
  app = await createApp("../routes/auth.js", "/api/auth", {
    requireAuth: false,
  });
});

describe("Auth Routes", () => {
  // ── POST /register ──
  describe("POST /api/auth/register", () => {
    it("should register a new user", async () => {
      mockQuery("SELECT id FROM users WHERE email", null);
      mockQuery("INSERT INTO users", []);
      mockQuery("SELECT id, email, display_name", {
        id: "test-uuid-1",
        email: "new@example.com",
        display_name: "new",
        instrument: "Flute",
        level: "student",
        created_at: new Date().toISOString(),
      });

      const res = await request(app).post("/api/auth/register").send({
        email: "new@example.com",
        password: "password123",
        display_name: "New User",
      });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("user");
      expect(res.body).toHaveProperty("token");
    });

    it("should return 400 if email is missing", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({ password: "password123" });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/email/i);
    });

    it("should return 400 if password is too short", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({ email: "test@example.com", password: "short" });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/8 characters/);
    });

    it("should return 400 for invalid email format", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({ email: "invalid-email", password: "password123" });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/email format/i);
    });

    it("should return 409 if email already exists", async () => {
      mockQuery("SELECT id FROM users WHERE email", { id: "existing" });

      const res = await request(app)
        .post("/api/auth/register")
        .send({ email: "existing@example.com", password: "password123" });

      expect(res.status).toBe(409);
    });
  });

  // ── POST /login ──
  describe("POST /api/auth/login", () => {
    it("should login with valid credentials", async () => {
      mockQuery("SELECT * FROM users WHERE email", {
        id: "user-1",
        email: "test@example.com",
        password_hash: "hashed_password123",
        display_name: "Test",
        instrument: "Flute",
        level: "student",
      });

      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "test@example.com", password: "password123" });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("token");
      expect(res.body.user).not.toHaveProperty("password_hash");
    });

    it("should return 400 if email or password missing", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "test@example.com" });

      expect(res.status).toBe(400);
    });

    it("should return 401 for non-existent user", async () => {
      mockQuery("SELECT * FROM users WHERE email", null);

      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "nobody@example.com", password: "password123" });

      expect(res.status).toBe(401);
    });

    it("should return 401 for wrong password", async () => {
      mockQuery("SELECT * FROM users WHERE email", {
        id: "user-1",
        email: "test@example.com",
        password_hash: "hashed_correctpassword",
      });

      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "test@example.com", password: "wrongpassword" });

      expect(res.status).toBe(401);
    });
  });

  // ── GET /me ──
  describe("GET /api/auth/me", () => {
    let authApp;
    beforeAll(async () => {
      // This route needs requireAuth
      const express = (await import("express")).default;
      const cookieParser = (await import("cookie-parser")).default;
      const { requireAuth } = await import("../../middleware/auth.js");
      const authRouter = (await import("../../routes/auth.js")).default;

      authApp = express();
      authApp.use(express.json());
      authApp.use(cookieParser());
      process.env.AUTH_REQUIRED = "true";
      app.use("/api/auth-protected", requireAuth, authRouter);
    });

    it("should return 401 without token", async () => {
      process.env.AUTH_REQUIRED = "true";
      const res = await request(app).get("/api/auth-protected/me");
      expect(res.status).toBe(401);
    });

    it("should return user profile with valid token", async () => {
      const token = generateToken({ id: "user-1" });
      mockQuery("SELECT id, email, display_name", {
        id: "user-1",
        email: "test@example.com",
        display_name: "Test",
        instrument: "Flute",
        level: "student",
      });

      const res = await request(app)
        .get("/api/auth-protected/me")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe("user-1");
    });

    it("should return 404 if user not in db", async () => {
      const token = generateToken({ id: "nonexistent" });
      // All queries return empty by default

      const res = await request(app)
        .get("/api/auth-protected/me")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });

  // ── PUT /me ──
  describe("PUT /api/auth/me", () => {
    it("should update profile with valid token", async () => {
      const token = generateToken({ id: "user-1" });
      mockQuery("SELECT * FROM users WHERE id", {
        id: "user-1",
        display_name: "Old",
        instrument: "Flute",
        level: "student",
      });
      mockQuery("UPDATE users", []);
      mockQuery("SELECT id, email, display_name", {
        id: "user-1",
        display_name: "New Name",
        instrument: "Clarinet",
        level: "student",
      });

      const res = await request(app)
        .put("/api/auth-protected/me")
        .set("Authorization", `Bearer ${token}`)
        .send({ display_name: "New Name", instrument: "Clarinet" });

      expect(res.status).toBe(200);
    });
  });

  // ── PUT /me/password ──
  describe("PUT /api/auth/me/password", () => {
    it("should return 400 without current or new password", async () => {
      const token = generateToken({ id: "user-1" });

      const res = await request(app)
        .put("/api/auth-protected/me/password")
        .set("Authorization", `Bearer ${token}`)
        .send({ current_password: "old" });

      expect(res.status).toBe(400);
    });

    it("should return 400 if new password too short", async () => {
      const token = generateToken({ id: "user-1" });

      const res = await request(app)
        .put("/api/auth-protected/me/password")
        .set("Authorization", `Bearer ${token}`)
        .send({ current_password: "oldpassword", new_password: "short" });

      expect(res.status).toBe(400);
    });

    it("should change password with correct current password", async () => {
      const token = generateToken({ id: "user-1" });
      mockQuery("SELECT * FROM users WHERE id", {
        id: "user-1",
        password_hash: "hashed_oldpassword",
      });
      mockQuery("UPDATE users SET password_hash", []);

      const res = await request(app)
        .put("/api/auth-protected/me/password")
        .set("Authorization", `Bearer ${token}`)
        .send({
          current_password: "oldpassword",
          new_password: "newpassword123",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("should return 401 for wrong current password", async () => {
      const token = generateToken({ id: "user-1" });
      mockQuery("SELECT * FROM users WHERE id", {
        id: "user-1",
        password_hash: "hashed_correctpassword",
      });

      const res = await request(app)
        .put("/api/auth-protected/me/password")
        .set("Authorization", `Bearer ${token}`)
        .send({
          current_password: "wrongpassword",
          new_password: "newpassword123",
        });

      expect(res.status).toBe(401);
    });
  });
});
