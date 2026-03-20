import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import type {
  AudioAnalysisData,
  ProblemSpot,
  BarResult,
} from "../../core/types";
import { Save, Trash2, AlertTriangle, Clock } from "lucide-react";

interface Props {
  duration: number;
  audioBlob: Blob;
  summary: {
    pitch_accuracy_pct: number;
    dynamic_range_db: number;
    avg_rms: number;
    avg_spectral_centroid: number;
    avg_spectral_flatness: number;
    pitch_stability: number;
    overall_rating: "needs_work" | "acceptable" | "solid" | "excellent";
    problem_spots: ProblemSpot[];
    note_events: {
      time: number;
      frequency: number;
      note: string;
      duration: number;
      velocity: number;
    }[];
  };
  analysis: AudioAnalysisData;
  barResults?: BarResult[];
  onSave: (title: string) => void;
  onDiscard: () => void;
  isSaving?: boolean;
}

const RATING_COLORS: Record<string, string> = {
  needs_work: "var(--pf-status-needs-work)",
  acceptable: "var(--pf-accent-gold)",
  solid: "var(--pf-status-in-progress)",
  excellent: "var(--pf-status-ready)",
};

const RATING_LABELS: Record<string, string> = {
  needs_work: "Needs Work",
  acceptable: "Acceptable",
  solid: "Solid",
  excellent: "Excellent",
};

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function pitchColor(pct: number): string {
  if (pct >= 80) return "var(--pf-status-ready)";
  if (pct >= 60) return "var(--pf-accent-gold)";
  return "var(--pf-status-needs-work)";
}

export function PostPlayReport({
  duration,
  audioBlob,
  summary,
  analysis,
  barResults,
  onSave,
  onDiscard,
  isSaving,
}: Props) {
  const [title, setTitle] = useState("");
  const audioUrl = useMemo(() => URL.createObjectURL(audioBlob), [audioBlob]);

  return (
    <div className="space-y-4">
      {/* Summary grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="text-center py-3">
            <div
              className="text-2xl font-bold"
              style={{ color: pitchColor(summary.pitch_accuracy_pct) }}
            >
              {summary.pitch_accuracy_pct}%
            </div>
            <div className="text-xs text-[var(--pf-text-secondary)]">
              Pitch Accuracy
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center py-3">
            <div
              className="text-2xl font-bold"
              style={{ color: "var(--pf-accent-teal)" }}
            >
              {summary.dynamic_range_db > 0
                ? summary.dynamic_range_db.toFixed(1)
                : "—"}
            </div>
            <div className="text-xs text-[var(--pf-text-secondary)]">
              Dynamic Range (dB)
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center py-3">
            <div
              className="text-2xl font-bold"
              style={{
                color:
                  summary.pitch_stability < 15
                    ? "var(--pf-status-ready)"
                    : "var(--pf-accent-gold)",
              }}
            >
              {summary.pitch_stability}
            </div>
            <div className="text-xs text-[var(--pf-text-secondary)]">
              Pitch Stability
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center py-3">
            <Badge color={RATING_COLORS[summary.overall_rating]}>
              {RATING_LABELS[summary.overall_rating]}
            </Badge>
            <div className="text-xs text-[var(--pf-text-secondary)] mt-1">
              Overall
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pitch trace (simple canvas-free visualization using bars) */}
      {analysis.pitch_trace.length > 0 && (
        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold">Pitch Trace</h3>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-px h-20 overflow-hidden">
              {analysis.pitch_trace
                .filter(
                  (_, i) =>
                    i %
                      Math.max(
                        1,
                        Math.floor(analysis.pitch_trace.length / 200),
                      ) ===
                    0,
                )
                .map((sample, i) => {
                  const cents = Math.abs(sample.cents_deviation);
                  const height = Math.max(4, Math.min(80, 80 - cents));
                  return (
                    <div
                      key={i}
                      className="flex-shrink-0"
                      style={{
                        width: 2,
                        height,
                        backgroundColor:
                          cents <= 15
                            ? "var(--pf-status-ready)"
                            : cents <= 30
                              ? "var(--pf-accent-gold)"
                              : "var(--pf-status-needs-work)",
                        opacity: 0.8,
                      }}
                    />
                  );
                })}
            </div>
            <div className="flex justify-between text-xs text-[var(--pf-text-secondary)] mt-1">
              <span>0:00</span>
              <span>{formatTime(duration)}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dynamics envelope */}
      {analysis.dynamics_envelope.length > 0 && (
        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold">Dynamics</h3>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-px h-16 overflow-hidden">
              {analysis.dynamics_envelope
                .filter(
                  (_, i) =>
                    i %
                      Math.max(
                        1,
                        Math.floor(analysis.dynamics_envelope.length / 200),
                      ) ===
                    0,
                )
                .map((sample, i) => {
                  const level = Math.min(1, sample.rms / 0.15);
                  return (
                    <div
                      key={i}
                      className="flex-shrink-0"
                      style={{
                        width: 2,
                        height: Math.max(2, level * 64),
                        backgroundColor: "var(--pf-accent-teal)",
                        opacity: 0.6 + level * 0.4,
                      }}
                    />
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Problem spots */}
      {summary.problem_spots.length > 0 && (
        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold">
              Problem Spots ({summary.problem_spots.length})
            </h3>
          </CardHeader>
          <CardContent className="space-y-2">
            {summary.problem_spots.slice(0, 10).map((spot, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <AlertTriangle
                  size={14}
                  style={{
                    color:
                      spot.severity === "major"
                        ? "var(--pf-status-needs-work)"
                        : spot.severity === "moderate"
                          ? "var(--pf-accent-gold)"
                          : "var(--pf-text-secondary)",
                  }}
                />
                <div className="flex-1">
                  <span className="text-[var(--pf-text-primary)]">
                    {spot.description}
                  </span>
                  <span className="text-xs text-[var(--pf-text-secondary)] ml-2">
                    {formatTime(spot.time_start)} — {formatTime(spot.time_end)}
                  </span>
                </div>
                <Badge
                  color={
                    spot.severity === "major"
                      ? "var(--pf-status-needs-work)"
                      : spot.severity === "moderate"
                        ? "var(--pf-accent-gold)"
                        : "var(--pf-text-secondary)"
                  }
                >
                  {spot.severity}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Bar results (score-aware) */}
      {barResults && barResults.length > 0 && (
        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold">Bar-by-Bar Results</h3>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1">
              {barResults.map((bar) => (
                <div
                  key={bar.bar_number}
                  className="w-8 h-8 rounded flex items-center justify-center text-xs font-medium text-white"
                  title={`Bar ${bar.bar_number}: ${bar.status}, ${bar.pitch_accuracy}% accuracy`}
                  aria-label={`Bar ${bar.bar_number}: ${bar.status}, ${bar.pitch_accuracy}% accuracy`}
                  style={{
                    backgroundColor:
                      bar.status === "accurate"
                        ? "var(--pf-status-ready)"
                        : bar.status === "minor_issues"
                          ? "var(--pf-accent-gold)"
                          : "var(--pf-status-needs-work)",
                  }}
                >
                  {bar.bar_number}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Audio playback + Save/Discard */}
      <Card>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <Clock size={14} className="text-[var(--pf-text-secondary)]" />
            <span className="text-sm text-[var(--pf-text-secondary)]">
              {formatTime(duration)}
            </span>
            <audio controls src={audioUrl} className="flex-1 h-8" />
          </div>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Recording title (optional)"
              className="flex-1 px-3 py-2 text-sm rounded-pf border border-[var(--pf-border-color)] bg-[var(--pf-bg-primary)] text-[var(--pf-text-primary)] focus:outline-none focus:border-[var(--pf-accent-gold)]"
            />
            <Button onClick={() => onSave(title)} disabled={isSaving}>
              <Save size={14} /> {isSaving ? "Saving..." : "Save"}
            </Button>
            <Button variant="ghost" onClick={onDiscard}>
              <Trash2 size={14} /> Discard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
