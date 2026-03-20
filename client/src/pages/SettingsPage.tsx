import { useTheme } from "../themes/ThemeProvider";
import { Card, CardContent, CardHeader } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input, Textarea } from "../components/ui/Input";
import { useEffect, useState, useRef } from "react";
import { api } from "../api/client";
import { themes, type ThemeName } from "../themes/tokens";
import {
  Bug,
  Lightbulb,
  Send,
  CheckCircle,
  Palette,
  Download,
  Upload,
  Plus,
  CreditCard,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { ThemeGallery } from "../components/community/ThemeGallery";
import { ThemeCreator } from "../components/community/ThemeCreator";
import {
  useExperienceLevel,
  type ExperienceLevel,
} from "../hooks/useExperienceLevel";
import type { SubscriptionInfo, SubscriptionTier } from "../core/types";

export function SettingsPage() {
  const {
    theme,
    setTheme,
    highContrast,
    setHighContrast,
    colourVisionMode,
    setColourVisionMode,
    reducedMotion,
    setReducedMotion,
    fontSize,
    setFontSize,
    applyCustomTokens,
  } = useTheme();
  const { level: experienceLevel, updateLevel: setExperienceLevel } =
    useExperienceLevel();
  const [showGallery, setShowGallery] = useState(false);
  const [showCreator, setShowCreator] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);

  const [sessionLength, setSessionLength] = useState(60);
  const [excerptCount, setExcerptCount] = useState(3);
  const [feedbackType, setFeedbackType] = useState<"bug" | "feature" | null>(
    null,
  );
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [aiSpend, setAiSpend] = useState<number | null>(null);
  const [timeAllocation, setTimeAllocation] = useState({
    warmup: 15,
    fundamentals: 10,
    technique: 20,
    repertoire: 35,
    excerpts: 15,
    buffer: 5,
  });
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(
    null,
  );

  useEffect(() => {
    api
      .getSubscription()
      .then((data: SubscriptionInfo) => setSubscription(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    api
      .getSettings()
      .then((data: Record<string, unknown>) => {
        if (typeof data.defaultSessionLength === "number")
          setSessionLength(data.defaultSessionLength);
        if (typeof data.excerptRotationCount === "number")
          setExcerptCount(data.excerptRotationCount);
        if (typeof data.ai_spend_total === "string")
          setAiSpend(parseFloat(data.ai_spend_total));
        else if (typeof data.ai_spend_total === "number")
          setAiSpend(data.ai_spend_total);
        if (data.timeAllocation && typeof data.timeAllocation === "object") {
          setTimeAllocation((prev) => ({
            ...prev,
            ...(data.timeAllocation as Record<string, number>),
          }));
        }
      })
      .catch(() => {});
  }, []);

  const savePractice = (key: string, value: number) => {
    api.updateSetting(key, value).catch(() => {});
  };

  const handleExportTheme = () => {
    const tokens = themes[theme];
    const blob = new Blob([JSON.stringify(tokens, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
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
          if (key.startsWith("--pf-") && typeof value === "string") {
            validTokens[key] = value;
          }
        }
        if (Object.keys(validTokens).length > 0) {
          applyCustomTokens(validTokens);
        }
      } catch {}
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Experience Level */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <h2 className="text-lg font-semibold">Experience Level</h2>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  value: "beginner" as ExperienceLevel,
                  title: "Getting Started",
                  desc: "I'm new to structured practice. Show me the essentials.",
                },
                {
                  value: "intermediate" as ExperienceLevel,
                  title: "Intermediate",
                  desc: "I practice regularly and want more tools.",
                },
                {
                  value: "advanced" as ExperienceLevel,
                  title: "Advanced",
                  desc: "Show me everything. I want full control.",
                },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setExperienceLevel(opt.value)}
                  className={`flex flex-col items-start gap-1 p-4 rounded-pf border-2 transition-colors text-left ${
                    experienceLevel === opt.value
                      ? "border-[var(--pf-accent-gold)] bg-[var(--pf-accent-gold)]/5"
                      : "border-[var(--pf-border-color)] hover:border-[var(--pf-accent-gold)]/50"
                  }`}
                >
                  <span className="font-medium text-sm">{opt.title}</span>
                  <span className="text-xs text-[var(--pf-text-secondary)]">
                    {opt.desc}
                  </span>
                </button>
              ))}
            </div>
            <p className="text-xs text-[var(--pf-text-secondary)] mt-3">
              Controls which features appear in the sidebar. You can change this
              any time.
            </p>
          </CardContent>
        </Card>

        {/* Plan & Billing */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <h2 className="text-lg font-semibold">Plan & Billing</h2>
          </CardHeader>
          <CardContent>
            {subscription ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-[var(--pf-accent-gold)]/10 flex items-center justify-center">
                    <CreditCard
                      size={18}
                      className="text-[var(--pf-accent-gold)]"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-lg capitalize">
                        {subscription.tier}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          subscription.status === "active"
                            ? "bg-[var(--pf-status-ready)]/10 text-[var(--pf-status-ready)]"
                            : subscription.status === "past_due"
                              ? "bg-[var(--pf-status-needs-work)]/10 text-[var(--pf-status-needs-work)]"
                              : "bg-[var(--pf-text-secondary)]/10 text-[var(--pf-text-secondary)]"
                        }`}
                      >
                        {subscription.status}
                      </span>
                    </div>
                    {subscription.cancel_at_period_end &&
                      subscription.current_period_end && (
                        <p className="text-xs text-[var(--pf-status-needs-work)]">
                          Cancels{" "}
                          {new Date(
                            subscription.current_period_end,
                          ).toLocaleDateString()}
                        </p>
                      )}
                  </div>
                </div>

                {/* AI Usage */}
                {subscription.ai_usage.limit > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-[var(--pf-text-secondary)]">
                        <Sparkles size={12} className="inline mr-1" />
                        AI Generations
                      </span>
                      <span className="text-sm font-mono">
                        {subscription.ai_usage.used}/
                        {subscription.ai_usage.limit}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-[var(--pf-bg-hover)] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[var(--pf-accent-gold)] transition-all"
                        style={{
                          width: `${Math.min(100, (subscription.ai_usage.used / subscription.ai_usage.limit) * 100)}%`,
                        }}
                      />
                    </div>
                    <p className="text-xs text-[var(--pf-text-secondary)] mt-1">
                      {subscription.ai_usage.remaining} remaining this month
                    </p>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  {subscription.tier === "free" ? (
                    <Button
                      size="sm"
                      onClick={() => (window.location.href = "/pricing")}
                    >
                      Upgrade Plan <ArrowRight size={14} />
                    </Button>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => (window.location.href = "/pricing")}
                      >
                        Change Plan
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={async () => {
                          try {
                            const { url } = await api.createPortal();
                            window.location.href = url;
                          } catch {}
                        }}
                      >
                        Manage Billing
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[var(--pf-bg-hover)] flex items-center justify-center">
                  <CreditCard
                    size={18}
                    className="text-[var(--pf-text-secondary)]"
                  />
                </div>
                <div>
                  <p className="font-medium">Free Plan</p>
                  <p className="text-sm text-[var(--pf-text-secondary)]">
                    3 sessions/week, 3 pieces, 5 excerpts
                  </p>
                </div>
                <Button
                  size="sm"
                  className="ml-auto"
                  onClick={() => (window.location.href = "/pricing")}
                >
                  Upgrade <ArrowRight size={14} />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">Appearance</h2>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Theme picker */}
            <div>
              <label className="text-sm font-medium text-[var(--pf-text-secondary)] mb-2 block">
                Theme
              </label>
              <div className="flex gap-3">
                {(["light", "dark", "midnight"] as ThemeName[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTheme(t)}
                    className={`flex flex-col items-center gap-2 p-3 rounded-pf border-2 transition-colors ${theme === t ? "border-[var(--pf-accent-gold)]" : "border-[var(--pf-border-color)]"}`}
                  >
                    <div
                      className="w-16 h-10 rounded-pf-sm border border-[var(--pf-border-color)]"
                      style={{
                        backgroundColor:
                          t === "light"
                            ? "#faf9f7"
                            : t === "dark"
                              ? "#0d1117"
                              : "#000000",
                      }}
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
                onChange={(e) => setFontSize(Number(e.target.value))}
                className="w-full accent-[var(--pf-accent-gold)]"
              />
              <div className="flex justify-between text-xs text-[var(--pf-text-secondary)]">
                <span>Smaller</span>
                <span>Larger</span>
              </div>
            </div>

            {/* Accessibility */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Accessibility</h3>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={highContrast}
                  onChange={(e) => setHighContrast(e.target.checked)}
                  className="accent-[var(--pf-accent-gold)]"
                />
                <span className="text-sm">High contrast mode</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={reducedMotion}
                  onChange={(e) => setReducedMotion(e.target.checked)}
                  className="accent-[var(--pf-accent-gold)]"
                />
                <span className="text-sm">Reduced motion</span>
              </label>

              <div>
                <label className="text-sm text-[var(--pf-text-secondary)] mb-1 block">
                  Colour vision mode
                </label>
                <select
                  value={colourVisionMode}
                  onChange={(e) => setColourVisionMode(e.target.value)}
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
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setShowGallery(!showGallery)}
                >
                  <Palette size={14} />{" "}
                  {showGallery ? "Hide Gallery" : "Browse Themes"}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setShowCreator(true)}
                >
                  <Plus size={14} /> Share Your Theme
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleExportTheme}
                >
                  <Download size={14} /> Export Theme
                </Button>
                <label className="inline-flex">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => importRef.current?.click()}
                  >
                    <Upload size={14} /> Import Theme
                  </Button>
                  <input
                    ref={importRef}
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={handleImportTheme}
                  />
                </label>
              </div>
              {showGallery && <ThemeGallery />}
            </div>
          </CardContent>
        </Card>

        {/* Practice */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">Practice</h2>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <Input
                label="Default session length (minutes)"
                type="number"
                min={15}
                max={240}
                value={sessionLength}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setSessionLength(v);
                  savePractice("defaultSessionLength", v);
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
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setExcerptCount(v);
                  savePractice("excerptRotationCount", v);
                }}
              />
            </div>

            <div>
              <h3 className="text-sm font-medium text-[var(--pf-text-secondary)] mb-2">
                Time allocation (%)
              </h3>
              <div className="flex flex-wrap gap-2 mb-3">
                {[
                  {
                    name: "Balanced",
                    alloc: {
                      warmup: 15,
                      fundamentals: 10,
                      technique: 20,
                      repertoire: 35,
                      excerpts: 15,
                      buffer: 5,
                    },
                  },
                  {
                    name: "Beginner",
                    alloc: {
                      warmup: 20,
                      fundamentals: 25,
                      technique: 15,
                      repertoire: 30,
                      excerpts: 0,
                      buffer: 10,
                    },
                  },
                  {
                    name: "Audition Prep",
                    alloc: {
                      warmup: 10,
                      fundamentals: 5,
                      technique: 15,
                      repertoire: 20,
                      excerpts: 45,
                      buffer: 5,
                    },
                  },
                  {
                    name: "Performance",
                    alloc: {
                      warmup: 10,
                      fundamentals: 5,
                      technique: 10,
                      repertoire: 60,
                      excerpts: 10,
                      buffer: 5,
                    },
                  },
                ].map((preset) => {
                  const isActive = Object.entries(preset.alloc).every(
                    ([k, v]) =>
                      timeAllocation[k as keyof typeof timeAllocation] === v,
                  );
                  return (
                    <button
                      key={preset.name}
                      onClick={() => {
                        setTimeAllocation(preset.alloc);
                        api
                          .updateSetting("timeAllocation", preset.alloc)
                          .catch(() => {});
                      }}
                      className={`px-3 py-1.5 rounded-pf text-xs font-medium transition-colors border ${
                        isActive
                          ? "border-[var(--pf-accent-gold)] bg-[var(--pf-accent-gold)]/10 text-[var(--pf-accent-gold)]"
                          : "border-[var(--pf-border-color)] text-[var(--pf-text-secondary)] hover:border-[var(--pf-accent-gold)]/50"
                      }`}
                    >
                      {preset.name}
                    </button>
                  );
                })}
              </div>
              <div className="space-y-2">
                {Object.entries(timeAllocation).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-3">
                    <span
                      className="text-xs w-24 text-[var(--pf-text-secondary)] capitalize"
                      title={
                        key === "warmup"
                          ? "Gentle exercises to get going"
                          : key === "fundamentals"
                            ? "Core skills: scales, tone, rhythm"
                            : key === "technique"
                              ? "Drills for tricky passages"
                              : key === "repertoire"
                                ? "The pieces you are learning"
                                : key === "excerpts"
                                  ? "Short passages for auditions"
                                  : "Extra time for anything"
                      }
                    >
                      {key === "warmup" ? "Warm-up" : key}
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={50}
                      value={value}
                      onChange={(e) => {
                        const newAlloc = {
                          ...timeAllocation,
                          [key]: Number(e.target.value),
                        };
                        setTimeAllocation(newAlloc);
                        api
                          .updateSetting("timeAllocation", newAlloc)
                          .catch(() => {});
                      }}
                      className="flex-1 accent-[var(--pf-accent-gold)]"
                      aria-label={`${key} allocation`}
                    />
                    <span className="text-xs w-8 text-right font-mono">
                      {value}%
                    </span>
                  </div>
                ))}
                <p className="text-xs text-[var(--pf-text-secondary)]">
                  Total:{" "}
                  {Object.values(timeAllocation).reduce((a, b) => a + b, 0)}%
                  {Object.values(timeAllocation).reduce((a, b) => a + b, 0) !==
                    100 && (
                    <span className="text-[var(--pf-status-needs-work)]">
                      {" "}
                      (should total 100%)
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* AI Spend */}
            {aiSpend !== null && (
              <div className="pt-3 border-t border-[var(--pf-border-color)]">
                <h3 className="text-sm font-medium text-[var(--pf-text-secondary)] mb-1">
                  AI Usage
                </h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-lg font-bold">
                    ${aiSpend.toFixed(4)}
                  </span>
                  <span className="text-xs text-[var(--pf-text-secondary)]">
                    total spent
                  </span>
                </div>
                <p className="text-xs text-[var(--pf-text-secondary)] mt-1">
                  Includes Claude API calls for score analysis and exercise
                  generation.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
        {/* Feedback */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <h2 className="text-lg font-semibold">Feedback</h2>
          </CardHeader>
          <CardContent>
            {feedbackSent ? (
              <div className="flex items-center gap-3 py-4">
                <CheckCircle
                  size={24}
                  style={{ color: "var(--pf-status-ready)" }}
                />
                <div>
                  <p className="font-medium">Thanks for your feedback!</p>
                  <p className="text-sm text-[var(--pf-text-secondary)]">
                    Your{" "}
                    {feedbackType === "bug" ? "bug report" : "feature request"}{" "}
                    has been saved.
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto"
                  onClick={() => {
                    setFeedbackSent(false);
                    setFeedbackType(null);
                    setFeedbackText("");
                  }}
                >
                  Submit another
                </Button>
              </div>
            ) : !feedbackType ? (
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <button
                  onClick={() => setFeedbackType("bug")}
                  className="flex-1 flex flex-col items-center gap-2 sm:gap-3 p-4 sm:p-6 rounded-pf border-2 border-[var(--pf-border-color)] hover:border-[var(--pf-status-needs-work)] transition-colors"
                >
                  <Bug
                    size={28}
                    className="sm:w-8 sm:h-8"
                    style={{ color: "var(--pf-status-needs-work)" }}
                  />
                  <span className="font-medium text-sm sm:text-base">
                    Report a Bug
                  </span>
                  <span className="text-xs text-[var(--pf-text-secondary)]">
                    Something isn't working right
                  </span>
                </button>
                <button
                  onClick={() => setFeedbackType("feature")}
                  className="flex-1 flex flex-col items-center gap-2 sm:gap-3 p-4 sm:p-6 rounded-pf border-2 border-[var(--pf-border-color)] hover:border-[var(--pf-accent-gold)] transition-colors"
                >
                  <Lightbulb
                    size={28}
                    className="sm:w-8 sm:h-8"
                    style={{ color: "var(--pf-accent-gold)" }}
                  />
                  <span className="font-medium text-sm sm:text-base">
                    Request a Feature
                  </span>
                  <span className="text-xs text-[var(--pf-text-secondary)]">
                    Suggest an improvement or new idea
                  </span>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  {feedbackType === "bug" ? (
                    <Bug
                      size={20}
                      style={{ color: "var(--pf-status-needs-work)" }}
                    />
                  ) : (
                    <Lightbulb
                      size={20}
                      style={{ color: "var(--pf-accent-gold)" }}
                    />
                  )}
                  <h3 className="font-medium">
                    {feedbackType === "bug" ? "Bug Report" : "Feature Request"}
                  </h3>
                  <button
                    onClick={() => {
                      setFeedbackType(null);
                      setFeedbackText("");
                    }}
                    className="ml-auto text-sm text-[var(--pf-text-secondary)] hover:text-[var(--pf-text-primary)]"
                  >
                    Cancel
                  </button>
                </div>
                <Textarea
                  label={
                    feedbackType === "bug"
                      ? "What happened? What did you expect?"
                      : "Describe the feature or improvement"
                  }
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder={
                    feedbackType === "bug"
                      ? 'e.g. When I click "Generate Session", the timer shows the wrong duration...'
                      : "e.g. It would be great if I could drag to reorder session blocks..."
                  }
                />
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    disabled={!feedbackText.trim()}
                    onClick={async () => {
                      await api.updateSetting(`feedback_${Date.now()}`, {
                        type: feedbackType,
                        text: feedbackText,
                        date: new Date().toISOString(),
                      });
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
      <p className="text-xs text-[var(--pf-text-secondary)] text-center mt-8">
        Practice Forge v0.20.Jolivet
      </p>

      <ThemeCreator
        open={showCreator}
        onClose={() => setShowCreator(false)}
        onCreated={() => {
          setShowCreator(false);
        }}
      />
    </div>
  );
}
