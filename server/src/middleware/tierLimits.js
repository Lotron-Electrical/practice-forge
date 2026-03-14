/**
 * Tier enforcement middleware
 * Checks user's subscription tier and enforces feature/usage limits.
 */

import { queryOne, queryAll } from '../db/helpers.js';

// Tier definitions — limits per tier
const TIER_LIMITS = {
  free: {
    pieces: 3,
    excerpts: 5,
    sessions_per_week: 3,
    ai_generations_per_month: 0,
    community: false,
    audio_analysis: false,
    score_following: false,
  },
  solo: {
    pieces: Infinity,
    excerpts: Infinity,
    sessions_per_week: Infinity,
    ai_generations_per_month: 15,
    community: false,
    audio_analysis: true,
    score_following: false,
  },
  pro: {
    pieces: Infinity,
    excerpts: Infinity,
    sessions_per_week: Infinity,
    ai_generations_per_month: 60,
    community: true,
    audio_analysis: true,
    score_following: true,
  },
  teacher: {
    pieces: Infinity,
    excerpts: Infinity,
    sessions_per_week: Infinity,
    ai_generations_per_month: 60,
    community: true,
    audio_analysis: true,
    score_following: true,
  },
};

export function getTierLimits(tier) {
  return TIER_LIMITS[tier] || TIER_LIMITS.free;
}

/**
 * Get the user's current subscription tier
 */
export async function getUserTier(userId) {
  const sub = await queryOne(
    `SELECT tier, status FROM subscriptions WHERE user_id = $1`,
    [userId]
  );
  if (!sub || sub.status === 'cancelled') return 'free';
  return sub.tier;
}

/**
 * Get AI usage count for current billing month
 */
export async function getAiUsageThisMonth(userId) {
  const row = await queryOne(
    `SELECT COUNT(*) as count FROM ai_usage
     WHERE user_id = $1
     AND created_at >= date_trunc('month', NOW())`,
    [userId]
  );
  return parseInt(row?.count || '0', 10);
}

/**
 * Middleware factory: require a minimum tier
 */
export function requireTier(...allowedTiers) {
  return async (req, res, next) => {
    try {
      const tier = await getUserTier(req.user.id);
      req.userTier = tier;
      if (allowedTiers.includes(tier)) return next();
      return res.status(403).json({
        error: 'upgrade_required',
        message: `This feature requires a ${allowedTiers[0]} plan or higher.`,
        current_tier: tier,
        required_tiers: allowedTiers,
      });
    } catch (err) {
      // If subscriptions table doesn't exist yet, allow through as free
      req.userTier = 'free';
      next();
    }
  };
}

/**
 * Middleware: enforce AI generation limits
 */
export async function enforceAiLimit(req, res, next) {
  try {
    const tier = await getUserTier(req.user.id);
    req.userTier = tier;
    const limits = getTierLimits(tier);

    if (limits.ai_generations_per_month === 0) {
      return res.status(403).json({
        error: 'upgrade_required',
        message: 'AI exercise generation requires a Solo plan or higher.',
        current_tier: tier,
        required_tiers: ['solo', 'pro', 'teacher'],
      });
    }

    const used = await getAiUsageThisMonth(req.user.id);
    if (used >= limits.ai_generations_per_month) {
      return res.status(403).json({
        error: 'limit_reached',
        message: `You've used all ${limits.ai_generations_per_month} AI generations this month.`,
        current_tier: tier,
        used,
        limit: limits.ai_generations_per_month,
        upgrade_tier: tier === 'solo' ? 'pro' : null,
      });
    }

    req.aiUsage = { used, limit: limits.ai_generations_per_month };
    next();
  } catch (err) {
    // If tables don't exist yet, allow through
    req.aiUsage = { used: 0, limit: Infinity };
    next();
  }
}

/**
 * Middleware factory: enforce count limits on a resource
 */
export function enforceCountLimit(resource, countQuery) {
  return async (req, res, next) => {
    try {
      const tier = await getUserTier(req.user.id);
      req.userTier = tier;
      const limits = getTierLimits(tier);
      const limit = limits[resource];

      if (limit === Infinity) return next();

      const row = await queryOne(countQuery, [req.user.id]);
      const count = parseInt(row?.count || '0', 10);

      if (count >= limit) {
        return res.status(403).json({
          error: 'limit_reached',
          message: `Free plan allows up to ${limit} ${resource}. Upgrade to add more.`,
          current_tier: tier,
          count,
          limit,
        });
      }

      next();
    } catch (err) {
      next();
    }
  };
}

/**
 * Middleware: enforce weekly session limit (free tier only)
 */
export async function enforceSessionLimit(req, res, next) {
  try {
    const tier = await getUserTier(req.user.id);
    req.userTier = tier;
    const limits = getTierLimits(tier);

    if (limits.sessions_per_week === Infinity) return next();

    const row = await queryOne(
      `SELECT COUNT(*) as count FROM practice_sessions
       WHERE created_at >= date_trunc('week', NOW())`,
      []
    );
    const count = parseInt(row?.count || '0', 10);

    if (count >= limits.sessions_per_week) {
      return res.status(403).json({
        error: 'limit_reached',
        message: `Free plan allows ${limits.sessions_per_week} sessions per week. Upgrade for unlimited sessions.`,
        current_tier: tier,
        count,
        limit: limits.sessions_per_week,
      });
    }

    next();
  } catch (err) {
    next();
  }
}
