import { Router } from "express";
import { queryOne, queryAll, execute } from "../db/helpers.js";
import { v4 as uuid } from "uuid";
import { asyncHandler } from "../utils/asyncHandler.js";
import { requireAuth } from "../middleware/auth.js";
import {
  getUserTier,
  getAiUsageThisMonth,
  getTierLimits,
} from "../middleware/tierLimits.js";
import Stripe from "stripe";

const router = Router();

// Lazy-init Stripe to avoid crash if key not set
let stripeClient = null;
function getStripe() {
  if (!stripeClient) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY not configured");
    stripeClient = new Stripe(key);
  }
  return stripeClient;
}

// Price IDs from env
const PRICES = {
  solo_monthly: () => process.env.STRIPE_PRICE_SOLO_MONTHLY,
  solo_annual: () => process.env.STRIPE_PRICE_SOLO_ANNUAL,
  pro_monthly: () => process.env.STRIPE_PRICE_PRO_MONTHLY,
  pro_annual: () => process.env.STRIPE_PRICE_PRO_ANNUAL,
  teacher_monthly: () => process.env.STRIPE_PRICE_TEACHER_MONTHLY,
  teacher_annual: () => process.env.STRIPE_PRICE_TEACHER_ANNUAL,
};

// Map Stripe price IDs to tiers
function tierFromPriceId(priceId) {
  if (priceId === PRICES.solo_monthly() || priceId === PRICES.solo_annual())
    return "solo";
  if (priceId === PRICES.pro_monthly() || priceId === PRICES.pro_annual())
    return "pro";
  if (
    priceId === PRICES.teacher_monthly() ||
    priceId === PRICES.teacher_annual()
  )
    return "teacher";
  return "solo"; // fallback
}

// GET /subscription — current plan + usage
router.get(
  "/subscription",
  requireAuth,
  asyncHandler(async (req, res) => {
    const sub = await queryOne(
      "SELECT * FROM subscriptions WHERE user_id = $1",
      [req.user.id],
    );

    const tier = sub?.status === "cancelled" ? "free" : sub?.tier || "free";
    const limits = getTierLimits(tier);
    const aiUsed = await getAiUsageThisMonth(req.user.id);

    res.json({
      tier,
      status: sub?.status || "active",
      current_period_start: sub?.current_period_start || null,
      current_period_end: sub?.current_period_end || null,
      cancel_at_period_end: sub?.cancel_at_period_end || false,
      stripe_customer_id: sub?.stripe_customer_id || null,
      ai_usage: {
        used: aiUsed,
        limit: limits.ai_generations_per_month,
        remaining: Math.max(0, limits.ai_generations_per_month - aiUsed),
      },
      limits,
    });
  }),
);

// GET /usage — AI usage details for current month
router.get(
  "/usage",
  requireAuth,
  asyncHandler(async (req, res) => {
    const tier = await getUserTier(req.user.id);
    const limits = getTierLimits(tier);
    const aiUsed = await getAiUsageThisMonth(req.user.id);

    // Get recent usage breakdown
    const rows = await queryAll(
      `SELECT generation_type, COUNT(*) as count, SUM(cost_usd) as total_cost
     FROM ai_usage
     WHERE user_id = $1 AND created_at >= date_trunc('month', NOW())
     GROUP BY generation_type`,
      [req.user.id],
    );

    res.json({
      tier,
      ai_generations: {
        used: aiUsed,
        limit: limits.ai_generations_per_month,
        remaining: Math.max(0, limits.ai_generations_per_month - aiUsed),
      },
      breakdown: rows,
    });
  }),
);

// GET /tiers — public tier info (no auth required)
router.get("/tiers", (req, res) => {
  res.json({
    tiers: [
      {
        id: "free",
        name: "Free",
        price_monthly: 0,
        price_annual: 0,
        features: [
          "3 sessions per week",
          "3 pieces, 5 excerpts",
          "Exercise library (browse)",
          "Basic dashboard",
          "Session history",
        ],
        limits: getTierLimits("free"),
      },
      {
        id: "solo",
        name: "Solo",
        price_monthly: 9,
        price_annual: 86,
        features: [
          "Unlimited sessions, pieces, excerpts",
          "15 AI generations per month",
          "Audio recording + feedback",
          "Metronome & score viewer",
          "Analytics + drift detection",
        ],
        limits: getTierLimits("solo"),
      },
      {
        id: "pro",
        name: "Pro",
        price_monthly: 16,
        price_annual: 154,
        features: [
          "Everything in Solo",
          "60 AI generations per month",
          "Audition prep mode",
          "Smart excerpt rotation",
          "Score-aware recording",
          "Community access",
          "Data export",
        ],
        limits: getTierLimits("pro"),
      },
      {
        id: "teacher",
        name: "Teacher Studio",
        coming_soon: true,
        features: [
          "Everything in Pro",
          "Multi-student management",
          "Assignments & progress tracking",
          "Priority feature requests",
        ],
        waitlist_only: true,
      },
    ],
  });
});

// POST /create-checkout-session — start Stripe checkout
router.post(
  "/create-checkout-session",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { tier, interval = "monthly" } = req.body;
    const priceKey = `${tier}_${interval}`;
    const priceId = PRICES[priceKey]?.();

    if (!priceId) {
      return res
        .status(400)
        .json({ error: `Invalid plan: ${tier} ${interval}` });
    }

    const s = getStripe();

    // Get or create Stripe customer
    let sub = await queryOne(
      "SELECT stripe_customer_id FROM subscriptions WHERE user_id = $1",
      [req.user.id],
    );
    let customerId = sub?.stripe_customer_id;

    if (!customerId) {
      const customer = await s.customers.create({
        email: req.user.email,
        metadata: { user_id: req.user.id },
      });
      customerId = customer.id;

      // Upsert subscription row
      await execute(
        `INSERT INTO subscriptions (id, user_id, stripe_customer_id, tier, status)
       VALUES ($1, $2, $3, 'free', 'active')
       ON CONFLICT (user_id) DO UPDATE SET stripe_customer_id = $3, updated_at = NOW()`,
        [uuid(), req.user.id, customerId],
      );
    }

    const baseUrl = process.env.APP_URL || "http://localhost:5173";
    const session = await s.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/settings?billing=success`,
      cancel_url: `${baseUrl}/settings?billing=cancelled`,
      metadata: { user_id: req.user.id, tier },
    });

    res.json({ url: session.url });
  }),
);

// POST /create-portal-session — Stripe customer portal
router.post(
  "/create-portal-session",
  requireAuth,
  asyncHandler(async (req, res) => {
    const sub = await queryOne(
      "SELECT stripe_customer_id FROM subscriptions WHERE user_id = $1",
      [req.user.id],
    );
    if (!sub?.stripe_customer_id) {
      return res.status(400).json({ error: "No billing account found" });
    }

    const s = getStripe();
    const baseUrl = process.env.APP_URL || "http://localhost:5173";
    const session = await s.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: `${baseUrl}/settings`,
    });

    res.json({ url: session.url });
  }),
);

// POST /webhook — Stripe webhook handler (no auth — verified by signature)
router.post(
  "/webhook",
  asyncHandler(async (req, res) => {
    const sig = req.headers["stripe-signature"];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      return res.status(500).json({ error: "Webhook secret not configured" });
    }

    let event;
    try {
      const s = getStripe();
      event = s.webhooks.constructEvent(
        req.rawBody || req.body,
        sig,
        webhookSecret,
      );
    } catch (err) {
      console.error("Webhook signature verification failed:", err.message);
      return res.status(400).json({ error: "Invalid signature" });
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const userId = session.metadata?.user_id;
        const tier = session.metadata?.tier || "solo";
        if (userId && session.subscription) {
          await execute(
            `UPDATE subscriptions SET
            stripe_subscription_id = $1, tier = $2, status = 'active', updated_at = NOW()
           WHERE user_id = $3`,
            [session.subscription, tier, userId],
          );
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object;
        const customerId = subscription.customer;
        const priceId = subscription.items?.data?.[0]?.price?.id;
        const tier = tierFromPriceId(priceId);

        await execute(
          `UPDATE subscriptions SET
          tier = $1,
          status = $2,
          current_period_start = to_timestamp($3),
          current_period_end = to_timestamp($4),
          cancel_at_period_end = $5,
          updated_at = NOW()
         WHERE stripe_customer_id = $6`,
          [
            tier,
            subscription.status === "active"
              ? "active"
              : subscription.status === "past_due"
                ? "past_due"
                : "cancelled",
            subscription.current_period_start,
            subscription.current_period_end,
            subscription.cancel_at_period_end || false,
            customerId,
          ],
        );
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        await execute(
          `UPDATE subscriptions SET tier = 'free', status = 'cancelled', updated_at = NOW()
         WHERE stripe_customer_id = $1`,
          [subscription.customer],
        );
        break;
      }

      default:
        // Unhandled event type
        break;
    }

    res.json({ received: true });
  }),
);

// POST /waitlist — Teacher Studio waitlist signup (no auth required)
router.post(
  "/waitlist",
  asyncHandler(async (req, res) => {
    const { email, studio_size } = req.body;
    if (!email || !email.includes("@")) {
      return res.status(400).json({ error: "Valid email required" });
    }

    const existing = await queryOne(
      "SELECT id FROM waitlist WHERE email = $1 AND tier = 'teacher'",
      [email],
    );
    if (existing) {
      return res.json({
        already_registered: true,
        message: "You're already on the waitlist!",
      });
    }

    const id = uuid();
    await execute(
      "INSERT INTO waitlist (id, email, tier, studio_size) VALUES ($1, $2, 'teacher', $3)",
      [id, email, studio_size || null],
    );
    res.status(201).json({ id, message: "You've been added to the waitlist!" });
  }),
);

export default router;
