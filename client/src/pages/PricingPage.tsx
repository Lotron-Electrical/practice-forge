import { useState, useEffect } from "react";
import { Check, Sparkles, Zap, Crown, GraduationCap } from "lucide-react";
import { Button } from "../components/ui/Button";
import { api } from "../api/client";
import type {
  TierDefinition,
  SubscriptionTier,
  SubscriptionInfo,
} from "../core/types";

const TIER_ICONS: Record<string, typeof Sparkles> = {
  free: Zap,
  solo: Sparkles,
  pro: Crown,
  teacher: GraduationCap,
};

const TIER_COLORS: Record<string, string> = {
  free: "var(--pf-text-secondary)",
  solo: "var(--pf-accent-gold)",
  pro: "var(--pf-accent-blue)",
  teacher: "var(--pf-accent-purple, #9b59b6)",
};

export function PricingPage() {
  const [tiers, setTiers] = useState<TierDefinition[]>([]);
  const [interval, setInterval] = useState<"monthly" | "annual">("monthly");
  const [currentTier, setCurrentTier] = useState<SubscriptionTier>("free");
  const [loading, setLoading] = useState<string | null>(null);
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [waitlistStudioSize, setWaitlistStudioSize] = useState("");
  const [waitlistSubmitted, setWaitlistSubmitted] = useState(false);
  const [waitlistError, setWaitlistError] = useState("");

  useEffect(() => {
    api
      .getTiers()
      .then((data: { tiers: TierDefinition[] }) => setTiers(data.tiers))
      .catch(() => {});
    api
      .getSubscription()
      .then((data: SubscriptionInfo) => setCurrentTier(data.tier))
      .catch(() => {});
  }, []);

  const handleCheckout = async (tierId: string) => {
    setLoading(tierId);
    try {
      const { url } = await api.createCheckout(tierId, interval);
      window.location.href = url;
    } catch {
      // Stripe not configured — show message
      setLoading(null);
    }
  };

  const handleWaitlist = async () => {
    setWaitlistError("");
    try {
      await api.joinWaitlist(
        waitlistEmail,
        waitlistStudioSize ? parseInt(waitlistStudioSize) : undefined,
      );
      setWaitlistSubmitted(true);
    } catch {
      setWaitlistError("Something went wrong. Please try again.");
    }
  };

  const handleManage = async () => {
    try {
      const { url } = await api.createPortal();
      window.location.href = url;
    } catch {}
  };

  return (
    <div>
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold mb-2">Choose Your Plan</h1>
        <p className="text-[var(--pf-text-secondary)]">
          Start free, upgrade when you're ready.
        </p>
      </div>

      {/* Interval toggle */}
      <div className="flex justify-center mb-8">
        <div className="flex rounded-pf border border-[var(--pf-border-color)] p-1 bg-[var(--pf-bg-card)]">
          <button
            onClick={() => setInterval("monthly")}
            className={`px-4 py-2 rounded-pf-sm text-sm font-medium transition-colors ${
              interval === "monthly"
                ? "bg-pf-gold text-white"
                : "text-[var(--pf-text-secondary)] hover:text-[var(--pf-text-primary)]"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setInterval("annual")}
            className={`px-4 py-2 rounded-pf-sm text-sm font-medium transition-colors ${
              interval === "annual"
                ? "bg-pf-gold text-white"
                : "text-[var(--pf-text-secondary)] hover:text-[var(--pf-text-primary)]"
            }`}
          >
            Annual <span className="text-xs opacity-75">Save 20%</span>
          </button>
        </div>
      </div>

      {/* Tier cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 max-w-6xl mx-auto">
        {tiers.map((tier) => {
          const Icon = TIER_ICONS[tier.id] || Zap;
          const color = TIER_COLORS[tier.id];
          const price =
            interval === "monthly" ? tier.price_monthly : tier.price_annual;
          const isCurrent = currentTier === tier.id;
          const isPopular = tier.id === "pro";
          const isComingSoon = tier.coming_soon === true;

          return (
            <div
              key={tier.id}
              className={`relative flex flex-col rounded-pf border-2 bg-[var(--pf-bg-card)] p-5 ${
                isPopular
                  ? "border-[var(--pf-accent-blue)] shadow-lg"
                  : isCurrent
                    ? "border-[var(--pf-accent-gold)]"
                    : "border-[var(--pf-border-color)]"
              }`}
            >
              {isPopular && !isComingSoon && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-[var(--pf-accent-blue)] text-white text-xs font-medium">
                  Most Popular
                </div>
              )}
              {isComingSoon && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-[var(--pf-text-secondary)] text-white text-xs font-medium">
                  Coming Soon
                </div>
              )}

              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Icon size={20} style={{ color }} />
                  <h3 className="text-lg font-bold">{tier.name}</h3>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold">${price}</span>
                  {price > 0 && (
                    <span className="text-sm text-[var(--pf-text-secondary)]">
                      /{interval === "monthly" ? "mo" : "yr"}
                    </span>
                  )}
                </div>
                {tier.per_student_monthly && (
                  <p className="text-xs text-[var(--pf-text-secondary)] mt-1">
                    + $
                    {interval === "monthly"
                      ? tier.per_student_monthly
                      : tier.per_student_annual}
                    /student/{interval === "monthly" ? "mo" : "yr"}
                  </p>
                )}
                {interval === "annual" && price > 0 && (
                  <p className="text-xs text-[var(--pf-accent-gold)] mt-1">
                    ${(price / 12).toFixed(0)}/mo billed annually
                  </p>
                )}
              </div>

              <ul className="flex-1 space-y-2 mb-5">
                {tier.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Check
                      size={14}
                      className="mt-0.5 shrink-0"
                      style={{ color }}
                    />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              {isComingSoon ? (
                waitlistSubmitted ? (
                  <p
                    className="text-sm text-center"
                    style={{ color: "var(--pf-status-ready)" }}
                  >
                    You're on the list!
                  </p>
                ) : waitlistOpen ? (
                  <div className="space-y-2">
                    <input
                      type="email"
                      placeholder="Your email"
                      value={waitlistEmail}
                      onChange={(e) => setWaitlistEmail(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-pf border border-[var(--pf-border-color)] bg-[var(--pf-bg-primary)] text-[var(--pf-text-primary)]"
                    />
                    <input
                      type="number"
                      placeholder="Studio size (optional)"
                      value={waitlistStudioSize}
                      onChange={(e) => setWaitlistStudioSize(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-pf border border-[var(--pf-border-color)] bg-[var(--pf-bg-primary)] text-[var(--pf-text-primary)]"
                    />
                    {waitlistError && (
                      <p
                        className="text-xs"
                        style={{ color: "var(--pf-status-needs-work)" }}
                      >
                        {waitlistError}
                      </p>
                    )}
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={handleWaitlist}
                      disabled={!waitlistEmail}
                    >
                      Submit
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full"
                    onClick={() => setWaitlistOpen(true)}
                  >
                    Join Waitlist
                  </Button>
                )
              ) : isCurrent ? (
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full"
                  onClick={tier.id !== "free" ? handleManage : undefined}
                  disabled={tier.id === "free"}
                >
                  {tier.id === "free" ? "Current Plan" : "Manage Billing"}
                </Button>
              ) : tier.id === "free" ? (
                <Button variant="ghost" size="sm" className="w-full" disabled>
                  Free Forever
                </Button>
              ) : (
                <Button
                  size="sm"
                  className="w-full"
                  onClick={() => handleCheckout(tier.id)}
                  disabled={loading === tier.id}
                >
                  {loading === tier.id ? "Redirecting..." : `Get ${tier.name}`}
                </Button>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-[var(--pf-text-secondary)] text-center mt-8">
        All plans include a 14-day money-back guarantee. Cancel any time.
      </p>
    </div>
  );
}
