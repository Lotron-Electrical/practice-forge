import { Router } from 'express';
import { queryAll, queryOne, execute } from '../db/helpers.js';
import { v4 as uuid } from 'uuid';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireTier } from '../middleware/tierLimits.js';

const router = Router();

// Community features require Pro tier or higher
router.use(requireTier('pro', 'teacher'));

// POST — follow a user
router.post('/follow/:userId', asyncHandler(async (req, res) => {
  const followingId = req.params.userId;
  if (followingId === req.user.id) return res.status(400).json({ error: 'Cannot follow yourself' });

  const existing = await queryOne(
    'SELECT id FROM follows WHERE follower_id = $1 AND following_id = $2',
    [req.user.id, followingId]
  );
  if (existing) return res.status(409).json({ error: 'Already following this user' });

  const id = uuid();
  await execute(
    'INSERT INTO follows (id, follower_id, following_id) VALUES ($1, $2, $3)',
    [id, req.user.id, followingId]
  );
  res.status(201).json({ id, follower_id: req.user.id, following_id: followingId });
}));

// DELETE — unfollow a user
router.delete('/follow/:userId', asyncHandler(async (req, res) => {
  await execute(
    'DELETE FROM follows WHERE follower_id = $1 AND following_id = $2',
    [req.user.id, req.params.userId]
  );
  res.json({ unfollowed: true });
}));

// GET — list users following the current user
router.get('/followers', asyncHandler(async (req, res) => {
  const followers = await queryAll(
    `SELECT u.id, u.display_name, u.instrument, u.level
     FROM follows f
     JOIN users u ON f.follower_id = u.id
     WHERE f.following_id = $1
     ORDER BY f.created_at DESC`,
    [req.user.id]
  );
  res.json(followers);
}));

// GET — list users the current user follows
router.get('/following', asyncHandler(async (req, res) => {
  const following = await queryAll(
    `SELECT u.id, u.display_name, u.instrument, u.level
     FROM follows f
     JOIN users u ON f.following_id = u.id
     WHERE f.follower_id = $1
     ORDER BY f.created_at DESC`,
    [req.user.id]
  );
  res.json(following);
}));

// GET — feed events from followed users + own events
router.get('/feed', asyncHandler(async (req, res) => {
  const events = await queryAll(
    `SELECT fe.*, u.display_name, u.instrument
     FROM feed_events fe
     JOIN users u ON fe.user_id = u.id
     WHERE fe.user_id IN (SELECT following_id FROM follows WHERE follower_id = $1)
        OR fe.user_id = $1
     ORDER BY fe.created_at DESC
     LIMIT 50`,
    [req.user.id]
  );
  res.json(events);
}));

// GET — search users by display_name (only public profiles)
router.get('/users/search', asyncHandler(async (req, res) => {
  const { q } = req.query;
  if (!q || q.trim().length === 0) return res.json([]);

  const users = await queryAll(
    `SELECT id, display_name, instrument, level
     FROM users
     WHERE display_name ILIKE $1
       AND privacy_settings->>'profile_visible' = 'true'
     ORDER BY display_name
     LIMIT 20`,
    [`%${q}%`]
  );
  res.json(users);
}));

// GET — public user profile
router.get('/users/:id', asyncHandler(async (req, res) => {
  const user = await queryOne(
    'SELECT id, display_name, instrument, level, institution, bio, privacy_settings FROM users WHERE id = $1',
    [req.params.id]
  );
  if (!user) return res.status(404).json({ error: 'User not found' });

  const privacy = user.privacy_settings || {};
  if (privacy.profile_visible === false || privacy.profile_visible === 'false') {
    return res.status(403).json({ error: 'This profile is private' });
  }

  const profile = {
    id: user.id,
    display_name: user.display_name,
    instrument: user.instrument,
    level: user.level,
    institution: user.institution,
    bio: user.bio,
  };

  // Achievements
  profile.achievements = await queryAll(
    `SELECT a.* FROM achievements a WHERE a.user_id = $1 ORDER BY a.earned_at DESC`,
    [req.params.id]
  );

  // Practice stats (only if stats_visible)
  if (privacy.stats_visible === true || privacy.stats_visible === 'true') {
    const stats = await queryOne(
      `SELECT COUNT(*) as total_sessions,
              COALESCE(SUM(actual_duration_min), 0) as total_minutes
       FROM practice_sessions
       WHERE user_id = $1 AND status = 'completed'`,
      [req.params.id]
    );
    profile.practice_stats = stats;
  }

  res.json(profile);
}));

export default router;
