// All theme tokens as CSS custom properties
// Every colour, size, font, shadow referenced by components

export interface ThemeTokens {
  // Backgrounds
  '--pf-bg-primary': string;
  '--pf-bg-secondary': string;
  '--pf-bg-card': string;
  '--pf-bg-nav': string;
  '--pf-bg-hover': string;
  '--pf-bg-active': string;
  '--pf-bg-input': string;

  // Text
  '--pf-text-primary': string;
  '--pf-text-secondary': string;
  '--pf-text-nav': string;
  '--pf-text-nav-active': string;
  '--pf-text-on-accent': string;

  // Accents
  '--pf-accent-gold': string;
  '--pf-accent-lavender': string;
  '--pf-accent-teal': string;
  '--pf-accent-orange': string;

  // Status
  '--pf-status-not-started': string;
  '--pf-status-needs-work': string;
  '--pf-status-in-progress': string;
  '--pf-status-solid': string;
  '--pf-status-ready': string;

  // Heatmap
  '--pf-heatmap-1': string;
  '--pf-heatmap-2': string;
  '--pf-heatmap-3': string;
  '--pf-heatmap-4': string;
  '--pf-heatmap-5': string;

  // Typography
  '--pf-font-heading': string;
  '--pf-font-body': string;
  '--pf-font-mono': string;

  // Sizing / Spacing
  '--pf-radius-sm': string;
  '--pf-radius-md': string;
  '--pf-radius-lg': string;

  // Shadows
  '--pf-shadow-card': string;
  '--pf-shadow-lg': string;

  // Focus
  '--pf-focus-ring': string;

  // Animation
  '--pf-animation-duration': string;

  // Borders
  '--pf-border-color': string;
  '--pf-border-width': string;
}

export const lightTheme: ThemeTokens = {
  '--pf-bg-primary': '#faf9f7',
  '--pf-bg-secondary': '#ffffff',
  '--pf-bg-card': '#ffffff',
  '--pf-bg-nav': '#1a1f36',
  '--pf-bg-hover': '#f0eeeb',
  '--pf-bg-active': '#e8e5e0',
  '--pf-bg-input': '#ffffff',

  '--pf-text-primary': '#1a1a2e',
  '--pf-text-secondary': '#8a8a9a',
  '--pf-text-nav': '#a0a4b8',
  '--pf-text-nav-active': '#ffffff',
  '--pf-text-on-accent': '#ffffff',

  '--pf-accent-gold': '#d4a843',
  '--pf-accent-lavender': '#9b8ec4',
  '--pf-accent-teal': '#3db8a2',
  '--pf-accent-orange': '#c77a3c',

  '--pf-status-not-started': '#8a8a9a',
  '--pf-status-needs-work': '#e85d5d',
  '--pf-status-in-progress': '#5b8def',
  '--pf-status-solid': '#d4a843',
  '--pf-status-ready': '#34b77c',

  '--pf-heatmap-1': '#e85d5d',
  '--pf-heatmap-2': '#e8935d',
  '--pf-heatmap-3': '#d4a843',
  '--pf-heatmap-4': '#7bc67b',
  '--pf-heatmap-5': '#34b77c',

  '--pf-font-heading': "'DM Sans', sans-serif",
  '--pf-font-body': "'IBM Plex Sans', sans-serif",
  '--pf-font-mono': "'JetBrains Mono', monospace",

  '--pf-radius-sm': '4px',
  '--pf-radius-md': '8px',
  '--pf-radius-lg': '12px',

  '--pf-shadow-card': '0 2px 8px rgba(0,0,0,0.08)',
  '--pf-shadow-lg': '0 4px 16px rgba(0,0,0,0.12)',

  '--pf-focus-ring': '0 0 0 3px rgba(91, 141, 239, 0.4)',

  '--pf-animation-duration': '200ms',

  '--pf-border-color': '#e5e5ea',
  '--pf-border-width': '1px',
};

export const darkTheme: ThemeTokens = {
  '--pf-bg-primary': '#0d1117',
  '--pf-bg-secondary': '#161b22',
  '--pf-bg-card': '#161b22',
  '--pf-bg-nav': '#0d1117',
  '--pf-bg-hover': '#1c2128',
  '--pf-bg-active': '#272d36',
  '--pf-bg-input': '#1c2128',

  '--pf-text-primary': '#e6edf3',
  '--pf-text-secondary': '#7d8590',
  '--pf-text-nav': '#7d8590',
  '--pf-text-nav-active': '#e6edf3',
  '--pf-text-on-accent': '#ffffff',

  '--pf-accent-gold': '#e8b84b',
  '--pf-accent-lavender': '#b0a3d4',
  '--pf-accent-teal': '#4fcdb5',
  '--pf-accent-orange': '#d98d4e',

  '--pf-status-not-started': '#7d8590',
  '--pf-status-needs-work': '#f07070',
  '--pf-status-in-progress': '#6b9cf7',
  '--pf-status-solid': '#e8b84b',
  '--pf-status-ready': '#3fc68a',

  '--pf-heatmap-1': '#f07070',
  '--pf-heatmap-2': '#f0a070',
  '--pf-heatmap-3': '#e8b84b',
  '--pf-heatmap-4': '#7bd47b',
  '--pf-heatmap-5': '#3fc68a',

  '--pf-font-heading': "'DM Sans', sans-serif",
  '--pf-font-body': "'IBM Plex Sans', sans-serif",
  '--pf-font-mono': "'JetBrains Mono', monospace",

  '--pf-radius-sm': '4px',
  '--pf-radius-md': '8px',
  '--pf-radius-lg': '12px',

  '--pf-shadow-card': '0 2px 8px rgba(0,0,0,0.3)',
  '--pf-shadow-lg': '0 4px 16px rgba(0,0,0,0.4)',

  '--pf-focus-ring': '0 0 0 3px rgba(107, 156, 247, 0.4)',

  '--pf-animation-duration': '200ms',

  '--pf-border-color': '#30363d',
  '--pf-border-width': '1px',
};

export const midnightTheme: ThemeTokens = {
  '--pf-bg-primary': '#000000',
  '--pf-bg-secondary': '#0a0a0a',
  '--pf-bg-card': '#0a0a0a',
  '--pf-bg-nav': '#000000',
  '--pf-bg-hover': '#141414',
  '--pf-bg-active': '#1e1e1e',
  '--pf-bg-input': '#141414',

  '--pf-text-primary': '#f0f0f0',
  '--pf-text-secondary': '#888888',
  '--pf-text-nav': '#888888',
  '--pf-text-nav-active': '#f0f0f0',
  '--pf-text-on-accent': '#ffffff',

  '--pf-accent-gold': '#f0c050',
  '--pf-accent-lavender': '#c0b0e0',
  '--pf-accent-teal': '#60e0c8',
  '--pf-accent-orange': '#e8a060',

  '--pf-status-not-started': '#888888',
  '--pf-status-needs-work': '#ff8080',
  '--pf-status-in-progress': '#80b0ff',
  '--pf-status-solid': '#f0c050',
  '--pf-status-ready': '#50d898',

  '--pf-heatmap-1': '#ff8080',
  '--pf-heatmap-2': '#ffb080',
  '--pf-heatmap-3': '#f0c050',
  '--pf-heatmap-4': '#80e080',
  '--pf-heatmap-5': '#50d898',

  '--pf-font-heading': "'DM Sans', sans-serif",
  '--pf-font-body': "'IBM Plex Sans', sans-serif",
  '--pf-font-mono': "'JetBrains Mono', monospace",

  '--pf-radius-sm': '4px',
  '--pf-radius-md': '8px',
  '--pf-radius-lg': '12px',

  '--pf-shadow-card': '0 1px 4px rgba(0,0,0,0.5)',
  '--pf-shadow-lg': '0 2px 8px rgba(0,0,0,0.6)',

  '--pf-focus-ring': '0 0 0 3px rgba(128, 176, 255, 0.4)',

  '--pf-animation-duration': '200ms',

  '--pf-border-color': '#222222',
  '--pf-border-width': '1px',
};

export const themes = { light: lightTheme, dark: darkTheme, midnight: midnightTheme } as const;
export type ThemeName = keyof typeof themes;
