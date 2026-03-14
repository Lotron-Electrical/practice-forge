import { queryAll, queryOne, execute } from '../db/helpers.js';
import { v4 as uuid } from 'uuid';

const ACHIEVEMENT_DEFS = [
  {
    key: 'first_steps',
    title: 'First Steps',
    check: async (userId) => {
      const row = await queryOne(
        `SELECT COUNT(*) AS cnt FROM practice_sessions WHERE status = 'completed'`
      );
      return parseInt(row.cnt, 10) >= 1;
    },
  },
  {
    key: 'streak_7',
    title: '7-Day Streak',
    check: async (userId) => checkConsecutiveDays(7),
  },
  {
    key: 'streak_30',
    title: '30-Day Streak',
    check: async (userId) => checkConsecutiveDays(30),
  },
  {
    key: 'streak_100',
    title: '100-Day Streak',
    check: async (userId) => checkConsecutiveDays(100),
  },
  {
    key: 'century',
    title: 'Century (100 Hours)',
    check: async (userId) => {
      const row = await queryOne(
        `SELECT COALESCE(SUM(actual_duration_min), 0) AS total FROM practice_sessions WHERE status = 'completed'`
      );
      return parseFloat(row.total) >= 6000;
    },
  },
  {
    key: 'excerpt_explorer',
    title: 'Excerpt Explorer',
    check: async (userId) => {
      const row = await queryOne(
        `SELECT COUNT(DISTINCT excerpt_id) AS cnt FROM excerpt_rotation_log WHERE practiced = true`
      );
      return parseInt(row.cnt, 10) >= 50;
    },
  },
  {
    key: 'challenge_champion',
    title: 'Challenge Champion',
    check: async (userId) => {
      const row = await queryOne(
        `SELECT COUNT(*) AS cnt FROM challenge_participants WHERE user_id = $1 AND rank = 1`,
        [userId]
      );
      return parseInt(row.cnt, 10) >= 10;
    },
  },
  {
    key: 'composers_friend',
    title: "Composer's Friend",
    check: async (userId) => {
      const row = await queryOne(
        `SELECT COUNT(*) AS cnt FROM exercises WHERE source_type = 'generated_ai'`
      );
      return parseInt(row.cnt, 10) >= 50;
    },
  },
  {
    key: 'community_contributor',
    title: 'Community Contributor',
    check: async (userId) => {
      const row = await queryOne(
        `SELECT COUNT(*) AS cnt FROM excerpt_community_notes WHERE user_id = $1`,
        [userId]
      );
      return parseInt(row.cnt, 10) >= 10;
    },
  },
  {
    key: 'perfectionist',
    title: 'Perfectionist',
    check: async (userId) => {
      const row = await queryOne(
        `SELECT 1 FROM assessments WHERE overall_score >= 95 LIMIT 1`
      );
      return !!row;
    },
  },
  {
    key: 'audition_ready',
    title: 'Audition Ready',
    check: async (userId) => {
      const total = await queryOne(`SELECT COUNT(*) AS cnt FROM excerpts`);
      if (parseInt(total.cnt, 10) === 0) return false;
      const ready = await queryOne(
        `SELECT COUNT(*) AS cnt FROM excerpts WHERE status IN ('solid', 'audition_ready')`
      );
      return parseInt(ready.cnt, 10) === parseInt(total.cnt, 10) && parseInt(total.cnt, 10) > 0;
    },
  },
];

async function checkConsecutiveDays(target) {
  const rows = await queryAll(
    `SELECT DISTINCT DATE(started_at) AS d
     FROM practice_sessions
     WHERE status = 'completed' AND started_at IS NOT NULL
     ORDER BY d`
  );
  if (rows.length < target) return false;

  let maxStreak = 1;
  let streak = 1;
  for (let i = 1; i < rows.length; i++) {
    const prev = new Date(rows[i - 1].d);
    const curr = new Date(rows[i].d);
    const diffDays = (curr - prev) / (1000 * 60 * 60 * 24);
    if (diffDays === 1) {
      streak++;
      if (streak > maxStreak) maxStreak = streak;
    } else {
      streak = 1;
    }
  }
  return maxStreak >= target;
}

export async function checkAchievements(userId) {
  const newlyEarned = [];

  for (const def of ACHIEVEMENT_DEFS) {
    // Skip if already earned
    const existing = await queryOne(
      'SELECT 1 FROM achievements WHERE user_id = $1 AND achievement_key = $2',
      [userId, def.key]
    );
    if (existing) continue;

    // Check criteria
    const earned = await def.check(userId);
    if (!earned) continue;

    // Award achievement
    const id = uuid();
    await execute(
      'INSERT INTO achievements (id, user_id, achievement_key) VALUES ($1, $2, $3)',
      [id, userId, def.key]
    );

    // Create feed event
    const feedId = uuid();
    await execute(
      `INSERT INTO feed_events (id, user_id, event_type, title, description, data)
       VALUES ($1, $2, 'achievement_earned', $3, $4, $5)`,
      [feedId, userId, def.title, `Earned the "${def.title}" achievement!`, JSON.stringify({ achievement_key: def.key })]
    );

    newlyEarned.push(def.key);
  }

  return newlyEarned;
}
