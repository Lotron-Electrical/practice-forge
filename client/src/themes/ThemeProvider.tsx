import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { themes, type ThemeName, type ThemeTokens } from './tokens';

interface ThemeContextValue {
  theme: ThemeName;
  setTheme: (t: ThemeName) => void;
  highContrast: boolean;
  setHighContrast: (v: boolean) => void;
  colourVisionMode: string;
  setColourVisionMode: (v: string) => void;
  reducedMotion: boolean;
  setReducedMotion: (v: boolean) => void;
  fontSize: number;
  setFontSize: (v: number) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

function applyTokens(tokens: ThemeTokens) {
  const root = document.documentElement;
  for (const [key, value] of Object.entries(tokens)) {
    root.style.setProperty(key, value);
  }
}

interface Props { children: ReactNode }

export function ThemeProvider({ children }: Props) {
  const [theme, setThemeState] = useState<ThemeName>('light');
  const [highContrast, setHighContrastState] = useState(false);
  const [colourVisionMode, setColourVisionModeState] = useState('none');
  const [reducedMotion, setReducedMotionState] = useState(false);
  const [fontSize, setFontSizeState] = useState(1);

  // Apply theme tokens whenever theme changes
  useEffect(() => {
    applyTokens(themes[theme]);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // High contrast adjustments
  useEffect(() => {
    document.documentElement.setAttribute('data-high-contrast', String(highContrast));
    if (highContrast) {
      document.documentElement.style.setProperty('--pf-border-width', '2px');
      document.documentElement.style.setProperty('--pf-focus-ring', '0 0 0 4px rgba(91, 141, 239, 0.8)');
    } else {
      document.documentElement.style.setProperty('--pf-border-width', '1px');
      const ring = themes[theme]['--pf-focus-ring'];
      document.documentElement.style.setProperty('--pf-focus-ring', ring);
    }
  }, [highContrast, theme]);

  // Reduced motion
  useEffect(() => {
    document.documentElement.setAttribute('data-reduced-motion', String(reducedMotion));
    document.documentElement.style.setProperty(
      '--pf-animation-duration',
      reducedMotion ? '0ms' : '200ms'
    );
  }, [reducedMotion]);

  // Font size (rem multiplier)
  useEffect(() => {
    document.documentElement.style.fontSize = `${fontSize}rem`;
  }, [fontSize]);

  // CVD mode
  useEffect(() => {
    document.documentElement.setAttribute('data-cvd', colourVisionMode);
  }, [colourVisionMode]);

  // Detect OS preferences on mount
  useEffect(() => {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setThemeState('dark');
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setReducedMotionState(true);
    }
    if (window.matchMedia('(prefers-contrast: more)').matches) {
      setHighContrastState(true);
    }
  }, []);

  // Persist to API
  const persist = useCallback((key: string, value: unknown) => {
    fetch('/api/settings/' + key, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value }),
    }).catch(() => {}); // silent fail
  }, []);

  const setTheme = (t: ThemeName) => { setThemeState(t); persist('theme', t); };
  const setHighContrast = (v: boolean) => { setHighContrastState(v); persist('highContrast', v); };
  const setColourVisionMode = (v: string) => { setColourVisionModeState(v); persist('colourVisionMode', v); };
  const setReducedMotion = (v: boolean) => { setReducedMotionState(v); persist('reducedMotion', v); };
  const setFontSize = (v: number) => { setFontSizeState(v); persist('fontSize', v); };

  // Load persisted settings on mount
  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(data => {
        if (data.theme && themes[data.theme as ThemeName]) setThemeState(data.theme as ThemeName);
        if (typeof data.highContrast === 'boolean') setHighContrastState(data.highContrast);
        if (data.colourVisionMode) setColourVisionModeState(data.colourVisionMode);
        if (typeof data.reducedMotion === 'boolean') setReducedMotionState(data.reducedMotion);
        if (typeof data.fontSize === 'number') setFontSizeState(data.fontSize);
      })
      .catch(() => {});
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, highContrast, setHighContrast, colourVisionMode, setColourVisionMode, reducedMotion, setReducedMotion, fontSize, setFontSize }}>
      {children}
    </ThemeContext.Provider>
  );
}
