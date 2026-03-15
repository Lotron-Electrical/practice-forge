import { useState, useEffect } from 'react';
import { api } from '../api/client';

export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';

const STORAGE_KEY = 'pf-experience-level';

function getStoredLevel(): ExperienceLevel {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'beginner' || stored === 'intermediate' || stored === 'advanced') return stored;
  } catch {
    // ignore
  }
  return 'intermediate';
}

export function useExperienceLevel() {
  const [level, setLevel] = useState<ExperienceLevel>(getStoredLevel);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api.getSettings().then((data: Record<string, unknown>) => {
      const serverLevel = data.experienceLevel;
      if (serverLevel === 'beginner' || serverLevel === 'intermediate' || serverLevel === 'advanced') {
        setLevel(serverLevel);
        try { localStorage.setItem(STORAGE_KEY, serverLevel); } catch {}
      }
    }).catch(() => {}).finally(() => setIsLoading(false));
  }, []);

  const updateLevel = (newLevel: ExperienceLevel) => {
    setLevel(newLevel);
    try { localStorage.setItem(STORAGE_KEY, newLevel); } catch {}
    api.updateSetting('experienceLevel', newLevel).catch(() => {});
  };

  return { level, isLoading, updateLevel };
}

// Which routes are visible at each level
const BEGINNER_PATHS = new Set(['/', '/pieces', '/session', '/record', '/tutorial', '/settings']);
const INTERMEDIATE_PATHS = new Set([...BEGINNER_PATHS, '/exercises', '/excerpts', '/analytics', '/profile']);
const ADVANCED_PATHS = new Set([...INTERMEDIATE_PATHS, '/media', '/assessments', '/community', '/taxonomy']);

// Sub-routes (e.g. /pieces/:id) should inherit from their parent
function normalizePath(path: string): string {
  const segments = path.split('/').filter(Boolean);
  if (segments.length === 0) return '/';
  return '/' + segments[0];
}

export function isPathAllowed(path: string, level: ExperienceLevel): boolean {
  // scores sub-route is under media, allow at advanced only
  const normalized = normalizePath(path);
  if (normalized === '/scores') {
    return level === 'advanced';
  }
  if (normalized === '/login') return true;
  switch (level) {
    case 'beginner': return BEGINNER_PATHS.has(normalized);
    case 'intermediate': return INTERMEDIATE_PATHS.has(normalized);
    case 'advanced': return true;
  }
}

// Filter sidebar nav items by label
const BEGINNER_LABELS = new Set(['Dashboard', 'Pieces', 'Session', 'Record', 'Help & Tour', 'Settings']);
const INTERMEDIATE_LABELS = new Set([...BEGINNER_LABELS, 'Exercises', 'Excerpts', 'Analytics', 'Profile']);

export function isNavItemAllowed(label: string, level: ExperienceLevel): boolean {
  switch (level) {
    case 'beginner': return BEGINNER_LABELS.has(label);
    case 'intermediate': return INTERMEDIATE_LABELS.has(label);
    case 'advanced': return true;
  }
}
