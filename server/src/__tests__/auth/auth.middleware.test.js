import { describe, it, expect, vi, beforeEach } from "vitest";
import jwt from "jsonwebtoken";
import {
  requireAuth,
  createToken,
  verifyToken,
  optionalAuth,
} from "../../middleware/auth.js";

const JWT_SECRET = "practice-forge-dev-secret-change-in-production";

function makeMockReqRes(overrides = {}) {
  const req = {
    headers: {},
    cookies: {},
    ...overrides,
  };
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  const next = vi.fn();
  return { req, res, next };
}

describe("auth middleware", () => {
  const testUser = {
    id: "u1",
    email: "test@example.com",
    display_name: "Test",
  };

  beforeEach(() => {
    process.env.AUTH_REQUIRED = "true";
  });

  describe("createToken / verifyToken", () => {
    it("creates a valid JWT that can be verified", () => {
      const token = createToken(testUser);
      const payload = verifyToken(token);
      expect(payload.id).toBe("u1");
      expect(payload.email).toBe("test@example.com");
      expect(payload.display_name).toBe("Test");
    });
  });

  describe("requireAuth", () => {
    it("passes with valid JWT in cookie", () => {
      const token = createToken(testUser);
      const { req, res, next } = makeMockReqRes({
        cookies: { pf_token: token },
      });
      requireAuth(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(req.user.id).toBe("u1");
      expect(res.status).not.toHaveBeenCalled();
    });

    it("passes with valid JWT in Authorization header", () => {
      const token = createToken(testUser);
      const { req, res, next } = makeMockReqRes({
        headers: { authorization: `Bearer ${token}` },
      });
      requireAuth(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(req.user.email).toBe("test@example.com");
    });

    it("prefers Authorization header over cookie", () => {
      const headerUser = {
        id: "h1",
        email: "header@test.com",
        display_name: "Header",
      };
      const cookieUser = {
        id: "c1",
        email: "cookie@test.com",
        display_name: "Cookie",
      };
      const { req, res, next } = makeMockReqRes({
        headers: { authorization: `Bearer ${createToken(headerUser)}` },
        cookies: { pf_token: createToken(cookieUser) },
      });
      requireAuth(req, res, next);
      expect(req.user.id).toBe("h1");
    });

    it("rejects expired JWT", () => {
      const token = jwt.sign(testUser, JWT_SECRET, { expiresIn: "-1s" });
      const { req, res, next } = makeMockReqRes({
        cookies: { pf_token: token },
      });
      requireAuth(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: "Invalid or expired token",
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("rejects malformed JWT", () => {
      const { req, res, next } = makeMockReqRes({
        cookies: { pf_token: "not.a.jwt" },
      });
      requireAuth(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it("rejects when no token provided", () => {
      const { req, res, next } = makeMockReqRes();
      requireAuth(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: "Authentication required",
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("bypasses auth in dev mode (AUTH_REQUIRED not true)", () => {
      delete process.env.AUTH_REQUIRED;
      const { req, res, next } = makeMockReqRes();
      requireAuth(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(req.user.id).toBe("dev-user");
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe("optionalAuth", () => {
    it("attaches user when valid token present", () => {
      const token = createToken(testUser);
      const { req, res, next } = makeMockReqRes({
        cookies: { pf_token: token },
      });
      optionalAuth(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(req.user.id).toBe("u1");
    });

    it("proceeds without user when no token and AUTH_REQUIRED=true", () => {
      const { req, res, next } = makeMockReqRes();
      optionalAuth(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(req.user).toBeUndefined();
    });

    it("sets dev user when no token and AUTH_REQUIRED is not true", () => {
      delete process.env.AUTH_REQUIRED;
      const { req, res, next } = makeMockReqRes();
      optionalAuth(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(req.user.id).toBe("dev-user");
    });

    it("falls back to dev user when token is invalid and AUTH_REQUIRED is not true", () => {
      delete process.env.AUTH_REQUIRED;
      const { req, res, next } = makeMockReqRes({
        cookies: { pf_token: "bad" },
      });
      optionalAuth(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(req.user.id).toBe("dev-user");
    });
  });
});
