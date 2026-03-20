import { Router } from "express";
import bcrypt from "bcrypt";
import { queryOne, execute } from "../db/helpers.js";
import { v4 as uuid } from "uuid";
import { createToken, requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();
const SALT_ROUNDS = 12;

// POST /register — create a new account
router.post(
  "/register",
  asyncHandler(async (req, res) => {
    const {
      email,
      password,
      display_name,
      instrument = "Flute",
      level = "student",
    } = req.body;

    if (!email || !password)
      return res.status(400).json({ error: "Email and password are required" });
    if (password.length < 8)
      return res
        .status(400)
        .json({ error: "Password must be at least 8 characters" });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return res.status(400).json({ error: "Invalid email format" });

    const existing = await queryOne("SELECT id FROM users WHERE email = $1", [
      email.toLowerCase(),
    ]);
    if (existing)
      return res
        .status(409)
        .json({ error: "An account with this email already exists" });

    const id = uuid();
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    await execute(
      `INSERT INTO users (id, email, password_hash, display_name, instrument, level)
     VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        id,
        email.toLowerCase(),
        passwordHash,
        display_name || email.split("@")[0],
        instrument,
        level,
      ],
    );

    const user = await queryOne(
      "SELECT id, email, display_name, instrument, level, created_at FROM users WHERE id = $1",
      [id],
    );
    const token = createToken(user);

    res.status(201).json({ user, token });
  }),
);

// POST /login — authenticate
router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ error: "Email and password are required" });

    const user = await queryOne("SELECT * FROM users WHERE email = $1", [
      email.toLowerCase(),
    ]);
    if (!user)
      return res.status(401).json({ error: "Invalid email or password" });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid)
      return res.status(401).json({ error: "Invalid email or password" });

    const token = createToken(user);

    // Return user without password hash
    const { password_hash, ...safeUser } = user;
    res.json({ user: safeUser, token });
  }),
);

// GET /me — get current user profile
router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await queryOne(
      "SELECT id, email, display_name, instrument, level, institution, bio, avatar_url, privacy_settings, created_at, updated_at FROM users WHERE id = $1",
      [req.user.id],
    );
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  }),
);

// PUT /me — update profile
router.put(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await queryOne("SELECT * FROM users WHERE id = $1", [
      req.user.id,
    ]);
    if (!user) return res.status(404).json({ error: "User not found" });

    const {
      display_name,
      instrument,
      level,
      institution,
      bio,
      privacy_settings,
    } = req.body;

    await execute(
      `UPDATE users SET display_name=$1, instrument=$2, level=$3, institution=$4, bio=$5, privacy_settings=$6, updated_at=NOW() WHERE id=$7`,
      [
        display_name ?? user.display_name,
        instrument ?? user.instrument,
        level ?? user.level,
        institution !== undefined ? institution : user.institution,
        bio !== undefined ? bio : user.bio,
        privacy_settings
          ? JSON.stringify(privacy_settings)
          : user.privacy_settings,
        req.user.id,
      ],
    );

    const updated = await queryOne(
      "SELECT id, email, display_name, instrument, level, institution, bio, avatar_url, privacy_settings, created_at, updated_at FROM users WHERE id = $1",
      [req.user.id],
    );
    res.json(updated);
  }),
);

// PUT /me/password — change password
router.put(
  "/me/password",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password)
      return res
        .status(400)
        .json({ error: "Current and new password required" });
    if (new_password.length < 8)
      return res
        .status(400)
        .json({ error: "New password must be at least 8 characters" });

    const user = await queryOne("SELECT * FROM users WHERE id = $1", [
      req.user.id,
    ]);
    if (!user) return res.status(404).json({ error: "User not found" });

    const valid = await bcrypt.compare(current_password, user.password_hash);
    if (!valid)
      return res.status(401).json({ error: "Current password is incorrect" });

    const newHash = await bcrypt.hash(new_password, SALT_ROUNDS);
    await execute(
      "UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2",
      [newHash, req.user.id],
    );

    res.json({ success: true });
  }),
);

export default router;
