import { useState } from "react";
import { Card, CardContent } from "../ui/Card";
import { Button } from "../ui/Button";
import { useAuth } from "../../auth/AuthContext";
import { Music, ArrowRight, Check } from "lucide-react";
import type { ExperienceLevel } from "../../hooks/useExperienceLevel";
import { api } from "../../api/client";

const INSTRUMENTS = [
  "Flute",
  "Clarinet",
  "Oboe",
  "Bassoon",
  "Saxophone",
  "Trumpet",
  "French Horn",
  "Trombone",
  "Tuba",
  "Violin",
  "Viola",
  "Cello",
  "Double Bass",
  "Piano",
  "Guitar",
  "Harp",
  "Percussion",
  "Voice",
  "Other",
];

const LEVELS: { value: string; title: string; desc: string }[] = [
  {
    value: "beginner",
    title: "Just starting out",
    desc: "I'm learning my first pieces and building fundamentals.",
  },
  {
    value: "student",
    title: "Student",
    desc: "I take lessons and practise regularly.",
  },
  {
    value: "returner",
    title: "Returning after a break",
    desc: "I used to play regularly and I'm getting back into it.",
  },
  {
    value: "advanced_student",
    title: "Advanced student",
    desc: "I'm preparing for exams, auditions, or conservatory.",
  },
  {
    value: "pre_professional",
    title: "Pre-professional",
    desc: "I'm studying at conservatory or auditioning for positions.",
  },
  {
    value: "professional",
    title: "Professional",
    desc: "I perform, teach, or work in music full-time.",
  },
];

const EXPERIENCE_MAP: Record<string, ExperienceLevel> = {
  beginner: "beginner",
  student: "beginner",
  returner: "beginner",
  advanced_student: "intermediate",
  pre_professional: "advanced",
  professional: "advanced",
};

interface OnboardingWizardProps {
  onComplete: () => void;
}

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const { updateUser } = useAuth();
  const [step, setStep] = useState(0);
  const [instrument, setInstrument] = useState("");
  const [level, setLevel] = useState("");
  const [saving, setSaving] = useState(false);

  const handleFinish = async () => {
    setSaving(true);
    try {
      await updateUser({
        instrument: instrument || undefined,
        level: level || undefined,
      } as any);
      // Set experience level based on musical level
      const expLevel = EXPERIENCE_MAP[level] || "intermediate";
      await api.updateSetting("experienceLevel", expLevel);
      try {
        localStorage.setItem("pf-experience-level", expLevel);
      } catch {}
    } catch {
      // Continue even if save fails
    }
    localStorage.setItem("pf-onboarding-complete", "true");
    setSaving(false);
    onComplete();
  };

  const handleSkip = () => {
    localStorage.setItem("pf-onboarding-complete", "true");
    onComplete();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--pf-bg-primary)] p-4">
      <div className="w-full max-w-md">
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full transition-all"
              style={{
                backgroundColor:
                  i <= step
                    ? "var(--pf-accent-gold)"
                    : "var(--pf-border-color)",
                width: i === step ? "1.5rem" : "0.5rem",
              }}
            />
          ))}
        </div>

        {step === 0 && (
          <Card>
            <CardContent className="py-8">
              <div className="text-center mb-6">
                <div
                  className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center"
                  style={{
                    backgroundColor:
                      "color-mix(in srgb, var(--pf-accent-gold) 15%, transparent)",
                  }}
                >
                  <Music size={28} style={{ color: "var(--pf-accent-gold)" }} />
                </div>
                <h2 className="text-xl font-semibold mb-1">
                  What do you play?
                </h2>
                <p className="text-sm text-[var(--pf-text-secondary)]">
                  This helps us tailor your practice sessions.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-6">
                {INSTRUMENTS.map((inst) => (
                  <button
                    key={inst}
                    onClick={() => setInstrument(inst)}
                    className={`px-2 py-2 rounded-pf text-sm transition-colors border ${
                      instrument === inst
                        ? "border-[var(--pf-accent-gold)] bg-[var(--pf-accent-gold)]/10 text-[var(--pf-text-primary)] font-medium"
                        : "border-[var(--pf-border-color)] text-[var(--pf-text-secondary)] hover:border-[var(--pf-accent-gold)]/50"
                    }`}
                  >
                    {inst}
                  </button>
                ))}
              </div>

              <div className="flex gap-2 justify-between">
                <button
                  onClick={handleSkip}
                  className="text-sm text-[var(--pf-text-secondary)] hover:text-[var(--pf-text-primary)] transition-colors"
                >
                  Skip setup
                </button>
                <Button onClick={() => setStep(1)} disabled={!instrument}>
                  Next <ArrowRight size={14} />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 1 && (
          <Card>
            <CardContent className="py-8">
              <div className="text-center mb-6">
                <h2 className="text-xl font-semibold mb-1">
                  How would you describe your level?
                </h2>
                <p className="text-sm text-[var(--pf-text-secondary)]">
                  We'll show you the right amount of features — you can change
                  this later.
                </p>
              </div>

              <div className="space-y-2 mb-6">
                {LEVELS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setLevel(opt.value)}
                    className={`w-full flex items-start gap-3 p-3 rounded-pf border-2 transition-colors text-left ${
                      level === opt.value
                        ? "border-[var(--pf-accent-gold)] bg-[var(--pf-accent-gold)]/5"
                        : "border-[var(--pf-border-color)] hover:border-[var(--pf-accent-gold)]/50"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        level === opt.value
                          ? "border-[var(--pf-accent-gold)] bg-[var(--pf-accent-gold)]"
                          : "border-[var(--pf-border-color)]"
                      }`}
                    >
                      {level === opt.value && (
                        <Check size={12} className="text-white" />
                      )}
                    </div>
                    <div>
                      <span className="font-medium text-sm">{opt.title}</span>
                      <p className="text-xs text-[var(--pf-text-secondary)] mt-0.5">
                        {opt.desc}
                      </p>
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex gap-2 justify-between">
                <Button variant="secondary" onClick={() => setStep(0)}>
                  Back
                </Button>
                <Button onClick={handleFinish} disabled={!level || saving}>
                  {saving ? "Saving..." : "Let's go!"}{" "}
                  {!saving && <ArrowRight size={14} />}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
