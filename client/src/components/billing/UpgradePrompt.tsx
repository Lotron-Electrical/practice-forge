import { Lock, ArrowRight } from 'lucide-react';
import { Button } from '../ui/Button';
import { api } from '../../api/client';
import type { SubscriptionTier } from '../../core/types';

interface UpgradePromptProps {
  message: string;
  currentTier: SubscriptionTier;
  requiredTiers?: SubscriptionTier[];
  onDismiss?: () => void;
}

const TIER_NAMES: Record<SubscriptionTier, string> = {
  free: 'Free',
  solo: 'Solo',
  pro: 'Pro',
  teacher: 'Teacher Studio',
};

const TIER_PRICES: Record<SubscriptionTier, string> = {
  free: '$0',
  solo: '$9/mo',
  pro: '$16/mo',
  teacher: '$49/mo',
};

export function UpgradePrompt({ message, currentTier, requiredTiers, onDismiss }: UpgradePromptProps) {
  const suggestedTier = requiredTiers?.[0] || 'solo';

  const handleUpgrade = async () => {
    try {
      const { url } = await api.createCheckout(suggestedTier, 'monthly');
      window.location.href = url;
    } catch {
      // Stripe not configured — redirect to pricing page
      window.location.href = '/pricing';
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 p-6 rounded-pf border-2 border-[var(--pf-accent-gold)]/30 bg-[var(--pf-accent-gold)]/5">
      <div className="w-12 h-12 rounded-full bg-[var(--pf-accent-gold)]/10 flex items-center justify-center">
        <Lock size={20} className="text-[var(--pf-accent-gold)]" />
      </div>
      <div className="text-center">
        <p className="font-medium text-[var(--pf-text-primary)] mb-1">{message}</p>
        <p className="text-sm text-[var(--pf-text-secondary)]">
          You're on the {TIER_NAMES[currentTier]} plan. Upgrade to {TIER_NAMES[suggestedTier]} ({TIER_PRICES[suggestedTier]}) to unlock this feature.
        </p>
      </div>
      <div className="flex gap-3">
        <Button size="sm" onClick={handleUpgrade}>
          Upgrade to {TIER_NAMES[suggestedTier]} <ArrowRight size={14} />
        </Button>
        {onDismiss && (
          <Button size="sm" variant="ghost" onClick={onDismiss}>
            Maybe later
          </Button>
        )}
      </div>
    </div>
  );
}
