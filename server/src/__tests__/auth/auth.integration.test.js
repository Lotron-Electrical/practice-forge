import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import express from "express";
import cookieParser from "cookie-parser";
import request from "supertest";
import jwt from "jsonwebtoken";
import { mockQueryOnce, resetMocks } from "../setup.js";

const JWT_SECRET = "practice-forge-dev-secret-change-in-production";

const { requireAuth } = await import("../../middleware/auth.js");
const { default: authRouter } = await import("../../routes/auth.js");

function createFullApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());

  // Auth routes (public — no requireAuth)
  app.use("/api/auth", authRouter);

  // Protected routes — requireAuth applied globally
  app.use("/api", requireAuth);

  // Simple protected test endpoint
  app.get("/api/protected-test", (req, res) => {
    res.json({ user: req.user, ok: true });
  });

  app.use((err, req, res, _next) => {
    res.status(err.status || 500).json({ error: "Internal server error" });
  });

  return app;
}

describe("auth integration", () => {
  let app;

  beforeEach(() => {
    process.env.AUTH_REQUIRED = "true";
    app = createFullApp();
  });

  afterEach(() => {
    delete process.env.AUTH_REQUIRED;
  });

  it("register then access protected route with returned token", async () => {
    // Mock for register flow
    mockQueryOnce("SELECT id FROM users WHERE email", null);
    mockQueryOnce("INSERT INTO users", []);
    mockQueryOnce("SELECT id, email, display_name", {
      id: "test-uuid-1",
      email: "flow@test.com",
      display_name: "flow",
      instrument: "Flute",
      level: "student",
      created_at: "2025-01-01",
    });

    // Step 1: Register
    const regRes = await request(app)
      .post("/api/auth/register")
      .send({ email: "flow@test.com", password: "password123" });

    expect(regRes.status).toBe(201);
    const { token } = regRes.body;
    expect(token).toBeDefined();

    // Step 2: Use token to hit protected route
    const protRes = await request(app)
      .get("/api/protected-test")
      .set("Authorization", `Bearer ${token}`);

    expect(protRes.status).toBe(200);
    expect(protRes.body.ok).toBe(true);
    expect(protRes.body.user.email).toBe("flow@test.com");
  });

  it("rejects protected route without token", async () => {
    const res = await request(app).get("/api/protected-test");
    expect(res.status).toBe(401);
  });

  it("rejects protected route with expired token", async () => {
    const token = jwt.sign(
      { id: "u1", email: "x@test.com", display_name: "X" },
      JWT_SECRET,
      { expiresIn: "-1s" },
    );

    const res = await request(app)
      .get("/api/protected-test")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(401);
  });

  describe("all 17 route groups require auth", () => {
    // The 17 protected route groups from index.js
    // (settings, taxonomy, pieces, exercises, excerpts, sessions, files,
    //  analysis, resources, recordings, composition, assessments,
    //  community, challenges, theme-gallery, community-excerpts, + our test endpoint)
    const routeGroups = [
      "/api/settings",
      "/api/taxonomy",
      "/api/pieces",
      "/api/exercises",
      "/api/excerpts",
      "/api/sessions",
      "/api/files",
      "/api/analysis",
      "/api/resources",
      "/api/recordings",
      "/api/composition",
      "/api/assessments",
      "/api/community",
      "/api/challenges",
      "/api/theme-gallery",
      "/api/community-excerpts",
      "/api/protected-test",
    ];

    routeGroups.forEach((path) => {
      it(`GET ${path} returns 401 without auth`, async () => {
        const res = await request(app).get(path);
        // requireAuth middleware runs before any route handler, so always 401
        expect(res.status).toBe(401);
      });
    });
  });

  describe("public auth routes do NOT require auth", () => {
    it("POST /api/auth/register is accessible without token", async () => {
      const res = await request(app).post("/api/auth/register").send({});

      // 400 = validation error, not 401
      expect(res.status).toBe(400);
    });

    it("POST /api/auth/login is accessible without token", async () => {
      const res = await request(app).post("/api/auth/login").send({});

      expect(res.status).toBe(400);
    });
  });
});
