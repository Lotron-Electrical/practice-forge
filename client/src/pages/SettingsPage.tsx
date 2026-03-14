import { useTheme } from '../themes/ThemeProvider';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Textarea } from '../components/ui/Input';
import { useEffect, useState, useRef } from 'react';
import { api } from '../api/client';
import { themes, type ThemeName } from '../themes/tokens';
import { Bug, Lightbulb, Send, CheckCircle, Palette, Download, Upload, Plus } from 'lucide-react';
import { ThemeGallery } from '../components/community/ThemeGallery';
import { ThemeCreator } from '../components/community/ThemeCreator';

export function SettingsPage() {
  const { theme, setTheme, highContrast, setHighContrast, colourVisionMode, setColourVisionMode, reducedMotion, setReducedMotion, fontSize, setFontSize, applyCustomTokens } = useTheme();
  const [showGallery, setShowGallery] = useState(false);
  const [showCreator, setShowCreator] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);

  const [sessionLength, setSessionLength] = useState(60);
  const [excerptCount, setExcerptCount] = useState(3);
  const [feedbackType, setFeedbackType] = useState<'bug' | 'feature' | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [aiSpend, setAiSpend] = useState<number | null>(null);
  const [timeAllocation, setTimeAllocation] = useState({
    warmup: 15, fundamentals: 10, technique: 20, repertoire: 35, excerpts: 15, buffer: 5,
  });

  useEffect(() => {
    api.getSettings().then((data: Record<string, unknown>) => {
      if (typeof data.defaultSessionLength === 'number') setSessionLength(data.defaultSessionLength);
      if (typeof data.excerptRotationCount === 'number') setExcerptCount(data.excerptRotationCount);
      if (typeof data.ai_spend_total === 'string') setAiSpend(parseFloat(data.ai_spend_total));
      else if (typeof data.ai_spend_total === 'number') setAiSpend(data.ai_spend_total);
      if (data.timeAllocation && typeof data.timeAllocation === 'object') {
        setTimeAllocation(prev => ({ ...prev, ...(data.timeAllocation as Record<string, number>) }));
      }
    }).catch(() => {});
  }, []);

  const savePractice = (key: string, value: number) => {
    api.updateSetting(key, value).catch(() => {});
  };

  const handleExportTheme = () => {
    const tokens = themes[theme];
    const blob = new Blob([JSON.stringify(tokens, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `practice-forge-theme-${theme}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportTheme = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        const validTokens: Record<string, string> = {};
        for (const [key, value] of Object.entries(parsed)) {
          if (key.startsWith('--pf-') && typeof value === 'string') {
            validTokens[key] = value;
          }
        }
        if (Object.keys(validTokens).length > 0) {
          applyCustomTokens(validTokens);
        }
      } catch {}
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Appearance */}
        <Card>
          <CardHeader><h2 className="text-lg font-semibold">Appearance</h2></CardHeader>
          <CardContent className="space-y-5">
            {/* Theme picker */}
            <div>
              <label className="text-sm font-medium text-[var(--pf-text-secondary)] mb-2 block">Theme</label>
              <div className="flex gap-3">
                {(['light', 'dark', 'midnight'] as ThemeName[]).map(t => (
                  <button
                    key={t}
                    onClick={() => setTheme(t)}
                    className={`flex flex-col items-center gap-2 p-3 rounded-pf border-2 transition-colors ${theme === t ? 'border-[var(--pf-accent-gold)]' : 'border-[var(--pf-border-color)]'}`}
                  >
                    <div
                      className="w-16 h-10 rounded-pf-sm border border-[var(--pf-border-color)]"
                      style={{ backgroundColor: t === 'light' ? '#faf9f7' : t === 'dark' ? '#0d1117' : '#000000' }}
                    />
                    <span className="text-xs font-medium capitalize">{t}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Font size */}
            <div>
              <label className="text-sm font-medium text-[var(--pf-text-secondary)] mb-2 block">
                Font size: {fontSize.toFixed(2)}rem
              </label>
              <input
                type="range"
                min="0.85"
                max="1.5"
                step="0.05"
                value={fontSize}
                onChange={e => setFontSize(Number(e.target.value))}
                className="w-full accent-[var(--pf-accent-gold)]"
              />
              <div className="flex justify-between text-xs text-[var(--pf-text-secondary)]">
                <span>Smaller</span><span>Larger</span>
              </div>
            </div>

            {/* Accessibility */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Accessibility</h3>

              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={highContrast} onChange={e => setHighContrast(e.target.checked)} className="accent-[var(--pf-accent-gold)]" />
                <span className="text-sm">High contrast mode</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={reducedMotion} onChange={e => setReducedMotion(e.target.checked)} className="accent-[var(--pf-accent-gold)]" />
                <span className="text-sm">Reduced motion</span>
              </label>

              <div>
                <label className="text-sm text-[var(--pf-text-secondary)] mb-1 block">Colour vision mode</label>
                <select
                  value={colourVisionMode}
                  onChange={e => setColourVisionMode(e.target.value)}
                  className="w-full px-3 py-2 rounded-pf-sm border border-[var(--pf-border-color)] bg-[var(--pf-bg-input)] text-[var(--pf-text-primary)]"
                >
                  <option value="none">None</option>
                  <option value="deuteranopia">Deuteranopia (red-green)</option>
                  <option value="protanopia">Protanopia (red-weak)</option>
                  <option value="tritanopia">Tritanopia (blue-yellow)</option>
                </select>
              </div>
            </div>

            {/* Theme Gallery */}
            <div className="space-y-3 pt-3 border-t border-[var(--pf-border-color)]">
              <h3 className="text-sm font-semibold">Community Themes</h3>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" onClick={() => setShowGallery(!showGallery)}>
                  <Palette size={14} /> {showGallery ? 'Hide Gallery' : 'Browse Themes'}
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setShowCreator(true)}>
                  <Plus size={14} /> Share Your Theme
                </Button>
                <Button size="sm" variant="secondary" onClick={handleExportTheme}>
                  <Download size={14} /> Export Theme
                </Button>
                <label className="inline-flex">
                  <Button size="sm" variant="secondary" onClick={() => importRef.current?.click()}>
                    <Upload size={14} /> Import Theme
                  </Button>
                  <input ref={importRef} type="file" accept=".json" className="hidden" onChange={handleImportTheme} />
                </label>
              </div>
              {showGallery && <ThemeGallery />}
            </div>
          </CardContent>
        </Card>

        {/* Practice */}
        <Card>
          <CardHeader><h2 className="text-lg font-semibold">Practice</h2></CardHeader>
          <CardContent className="space-y-5">
            <div>
              <Input
                label="Default session length (minutes)"
                type="number"
                min={15}
                max={240}
                value={sessionLength}
                onChange={e => {
                  const v = Number(e.target.value);
                  setSessionLength(v);
                  savePractice('defaultSessionLength', v);
                }}
              />
            </div>

            <div>
              <Input
                label="Excerpt rotation count per day"
                type="number"
                min={1}
                max={10}
                value={excerptCount}
                onChange={e => {
                  const v = Number(e.target.value);
                  setExcerptCount(v);
                  savePractice('excerptRotationCount', v);
                }}
              />
            </div>

            <div>
              <h3 className="text-sm font-medium text-[var(--pf-text-secondary)] mb-2">Time allocation (%)</h3>
              <div className="space-y-2">
                {Object.entries(timeAllocation).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-3">
                    <span className="text-xs w-24 text-[var(--pf-text-secondary)] capitalize">{key === 'warmup' ? 'Warm-up' : key}</span>
                    <input
                      type="range"
                      min={0}
                      max={50}
                      value={value}
                      onChange={e => {
                        const newAlloc = { ...timeAllocation, [key]: Number(e.target.value) };
                        setTimeAllocation(newAlloc);
                        api.updateSetting('timeAllocation', newAlloc).catch(() => {});
                      }}
                      className="flex-1 accent-[var(--pf-accent-gold)]"
                      aria-label={`${key} allocation`}
                    />
                    <span className="text-xs w-8 text-right font-mono">{value}%</span>
                  </div>
                ))}
                <p className="text-xs text-[var(--pf-text-secondary)]">
                  Total: {Object.values(timeAllocation).reduce((a, b) => a + b, 0)}%
                  {Object.values(timeAllocation).reduce((a, b) => a + b, 0) !== 100 && (
                    <span className="text-[var(--pf-status-needs-work)]"> (should total 100%)</span>
                  )}
                </p>
              </div>
            </div>

            {/* AI Spend */}
            {aiSpend !== null && (
              <div className="pt-3 border-t border-[var(--pf-border-color)]">
                <h3 className="text-sm font-medium text-[var(--pf-text-secondary)] mb-1">AI Usage</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-lg font-bold">${aiSpend.toFixed(4)}</span>
                  <span className="text-xs text-[var(--pf-text-secondary)]">total spent</span>
                </div>
                <p className="text-xs text-[var(--pf-text-secondary)] mt-1">Includes Claude API calls for score analysis and exercise generation.</p>
              </div>
            )}
          </CardContent>
        </Card>
        {/* Feedback */}
        <Card className="lg:col-span-2">
          <CardHeader><h2 className="text-lg font-semibold">Feedback</h2></CardHeader>
          <CardContent>
            {feedbackSent ? (
              <div className="flex items-center gap-3 py-4">
                <CheckCircle size={24} style={{ color: 'var(--pf-status-ready)' }} />
                <div>
                  <p className="font-medium">Thanks for your feedback!</p>
                  <p className="text-sm text-[var(--pf-text-secondary)]">Your {feedbackType === 'bug' ? 'bug report' : 'feature request'} has been saved.</p>
                </div>
                <Button variant="ghost" size="sm" className="ml-auto" onClick={() => { setFeedbackSent(false); setFeedbackType(null); setFeedbackText(''); }}>
                  Submit another
                </Button>
              </div>
            ) : !feedbackType ? (
              <div className="flex gap-4">
                <button
                  onClick={() => setFeedbackType('bug')}
                  className="flex-1 flex flex-col items-center gap-3 p-6 rounded-pf border-2 border-[var(--pf-border-color)] hover:border-[var(--pf-status-needs-work)] transition-colors"
                >
                  <Bug size={32} style={{ color: 'var(--pf-status-needs-work)' }} />
                  <span className="font-medium">Report a Bug</span>
                  <span className="text-xs text-[var(--pf-text-secondary)]">Something isn't working right</span>
                </button>
                <button
                  onClick={() => setFeedbackType('feature')}
                  className="flex-1 flex flex-col items-center gap-3 p-6 rounded-pf border-2 border-[var(--pf-border-color)] hover:border-[var(--pf-accent-gold)] transition-colors"
                >
                  <Lightbulb size={32} style={{ color: 'var(--pf-accent-gold)' }} />
                  <span className="font-medium">Request a Feature</span>
                  <span className="text-xs text-[var(--pf-text-secondary)]">Suggest an improvement or new idea</span>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  {feedbackType === 'bug' ? <Bug size={20} style={{ color: 'var(--pf-status-needs-work)' }} /> : <Lightbulb size={20} style={{ color: 'var(--pf-accent-gold)' }} />}
                  <h3 className="font-medium">{feedbackType === 'bug' ? 'Bug Report' : 'Feature Request'}</h3>
                  <button onClick={() => { setFeedbackType(null); setFeedbackText(''); }} className="ml-auto text-sm text-[var(--pf-text-secondary)] hover:text-[var(--pf-text-primary)]">Cancel</button>
                </div>
                <Textarea
                  label={feedbackType === 'bug' ? 'What happened? What did you expect?' : 'Describe the feature or improvement'}
                  value={feedbackText}
                  onChange={e => setFeedbackText(e.target.value)}
                  placeholder={feedbackType === 'bug' ? 'e.g. When I click "Generate Session", the timer shows the wrong duration...' : 'e.g. It would be great if I could drag to reorder session blocks...'}
                />
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    disabled={!feedbackText.trim()}
                    onClick={async () => {
                      await api.updateSetting(`feedback_${Date.now()}`, { type: feedbackType, text: feedbackText, date: new Date().toISOString() });
                      setFeedbackSent(true);
                    }}
                  >
                    <Send size={14} /> Submit
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Version */}
      <p className="text-xs text-[var(--pf-text-secondary)] text-center mt-8">Practice Forge v0.18.Vivaldi</p>

      <ThemeCreator open={showCreator} onClose={() => setShowCreator(false)} onCreated={() => { setShowCreator(false); }} />
    </div>
  );
}
