import { useAuth } from '../../auth/AuthContext';
import { ACHIEVEMENT_DEFS } from '../../core/types';
import type { Achievement } from '../../core/types';
import {
  Music, Flame, Clock, MapPin, Trophy, Sparkles, Heart, Diamond, Star,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const ICON_MAP: Record<string, LucideIcon> = {
  music: Music,
  flame: Flame,
  clock: Clock,
  'map-pin': MapPin,
  trophy: Trophy,
  sparkles: Sparkles,
  heart: Heart,
  diamond: Diamond,
  star: Star,
};

export function AchievementShelf() {
  const { user } = useAuth();
  const earned = (user as unknown as { achievements?: Achievement[] })?.achievements || [];
  const earnedMap = new Map(earned.map(a => [a.achievement_key, a]));

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {Object.entries(ACHIEVEMENT_DEFS).map(([key, def]) => {
        const achievement = earnedMap.get(key);
        const Icon = ICON_MAP[def.icon] || Star;
        const isEarned = !!achievement;

        return (
          <div
            key={key}
            className={`flex flex-col items-center text-center p-3 rounded-pf border transition-colors ${
              isEarned
                ? 'border-[var(--pf-accent-gold)] bg-[var(--pf-bg-hover)]'
                : 'border-[var(--pf-border-color)] opacity-40'
            }`}
          >
            <Icon
              size={24}
              style={{
                color: isEarned ? 'var(--pf-accent-gold)' : 'var(--pf-text-secondary)',
              }}
            />
            <span className="text-xs font-semibold mt-2">{def.label}</span>
            {isEarned && achievement ? (
              <span className="text-xs text-[var(--pf-text-secondary)] mt-0.5">
                {new Date(achievement.earned_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            ) : (
              <span className="text-xs text-[var(--pf-text-secondary)] mt-0.5">
                {def.description}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
