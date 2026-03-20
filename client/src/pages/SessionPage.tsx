import { useEffect, useState, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { api } from "../api/client";
import {
  Play,
  CheckCircle,
  SkipForward,
  Square,
  Clock,
  Sparkles,
  Music,
  BookOpen,
  ListMusic,
  Zap,
  Timer,
  ThumbsUp,
  Meh,
  ThumbsDown,
  Mic,
  ChevronDown,
  ChevronUp,
  Circle,
  RotateCcw,
  Save,
  Trash2,
  FolderOpen,
} from "lucide-react";
import { MetronomeControls } from "../components/recording/MetronomeControls";
import { useMetronome } from "../hooks/useMetronome";

interface Block {
  id: string;
  category: string;
  title: string;
  description: string;
  planned_duration_min: number;
  actual_duration_min: number | null;
  sort_order: number;
  status: string;
  linked_type: string | null;
  linked_id: string | null;
  focus_points: string;
  notes: string;
}

interface Session {
  id: string;
  date: string;
  planned_duration_min: number;
  actual_duration_min: number | null;
  status: string;
  rating: string | null;
  notes: string;
  blocks: Block[];
}

interface SessionTemplate {
  id: string;
  name: string;
  planned_duration_min: number;
  blocks: {
    category: string;
    title: string;
    description?: string;
    planned_duration_min: number;
    sort_order: number;
    linked_type?: string;
    linked_id?: string;
    focus_points?: string;
  }[];
  created_at: string;
}

const CATEGORY_CONFIG: Record<
  string,
  { icon: typeof Play; color: string; label: string; hint: string }
> = {
  warmup: {
    icon: Sparkles,
    color: "var(--pf-accent-gold)",
    label: "Warm-up",
    hint: "Gentle exercises to get your fingers moving",
  },
  fundamentals: {
    icon: Zap,
    color: "var(--pf-accent-teal)",
    label: "Fundamentals",
    hint: "Core skills like scales, tone, and rhythm",
  },
  technique: {
    icon: BookOpen,
    color: "var(--pf-accent-teal)",
    label: "Technique",
    hint: "Targeted drills for tricky passages",
  },
  repertoire: {
    icon: Music,
    color: "var(--pf-status-in-progress)",
    label: "Repertoire",
    hint: "The pieces and songs you are learning",
  },
  excerpts: {
    icon: ListMusic,
    color: "var(--pf-accent-lavender)",
    label: "Excerpts",
    hint: "Short passages for audition preparation",
  },
  buffer: {
    icon: Timer,
    color: "var(--pf-text-secondary)",
    label: "Flexible time",
    hint: "Use for anything that needs extra attention",
  },
};

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function SessionPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [lastSession, setLastSession] = useState<Session | null>(null);
  const [repeating, setRepeating] = useState(false);
  const [duration, setDuration] = useState(60);
  const [templates, setTemplates] = useState<SessionTemplate[]>([]);
  const [templateLoading, setTemplateLoading] = useState<string | null>(null);
  const [saveTemplateName, setSaveTemplateName] = useState("");
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [timer, setTimer] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Metronome panel
  const [metronomeOpen, setMetronomeOpen] = useState(false);
  const metronome = useMetronome();

  // Mini recorder
  const [recorderOpen, setRecorderOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recDuration, setRecDuration] = useState(0);
  const [recSaved, setRecSaved] = useState(false);
  const [recError, setRecError] = useState<string | null>(null);
  const recMediaRef = useRef<MediaRecorder | null>(null);
  const recChunksRef = useRef<Blob[]>([]);
  const recStreamRef = useRef<MediaStream | null>(null);
  const recTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recStartRef = useRef(0);

  const startInlineRecording = useCallback(async () => {
    setRecError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recStreamRef.current = stream;
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      recChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recChunksRef.current.push(e.data);
      };
      recorder.start(100);
      recMediaRef.current = recorder;
      recStartRef.current = performance.now();
      setRecDuration(0);
      setIsRecording(true);
      recTimerRef.current = setInterval(() => {
        setRecDuration(
          Math.floor((performance.now() - recStartRef.current) / 1000),
        );
      }, 200);
    } catch (err) {
      setRecError(
        err instanceof Error ? err.message : "Microphone access denied",
      );
    }
  }, []);

  const stopInlineRecording = useCallback(
    async (block: Block, sessionObj: Session) => {
      if (!recMediaRef.current) return;
      const recorder = recMediaRef.current;
      if (recTimerRef.current) {
        clearInterval(recTimerRef.current);
        recTimerRef.current = null;
      }

      return new Promise<void>((resolve) => {
        recorder.onstop = async () => {
          const blob = new Blob(recChunksRef.current, {
            type: recorder.mimeType,
          });
          const finalDuration =
            (performance.now() - recStartRef.current) / 1000;
          setIsRecording(false);
          if (recStreamRef.current) {
            recStreamRef.current.getTracks().forEach((t) => t.stop());
            recStreamRef.current = null;
          }

          try {
            const metadata: Record<string, string> = {
              filename: `recording-${Date.now()}.webm`,
              title: `${block.title} - ${new Date().toLocaleTimeString()}`,
              duration_seconds: String(Math.round(finalDuration)),
            };
            if (block.linked_type) metadata.linked_type = block.linked_type;
            if (block.linked_id) metadata.linked_id = block.linked_id;
            metadata.session_id = sessionObj.id;
            metadata.block_id = block.id;

            await api.createRecording(blob, metadata);
            setRecSaved(true);
            setTimeout(() => {
              setRecSaved(false);
              setRecorderOpen(false);
            }, 1500);
          } catch {
            setRecError("Failed to save recording");
          }
          resolve();
        };
        recorder.stop();
      });
    },
    [],
  );

  // Cleanup recorder on unmount
  useEffect(() => {
    return () => {
      if (recTimerRef.current) clearInterval(recTimerRef.current);
      if (recStreamRef.current)
        recStreamRef.current.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const loadCurrent = useCallback(() => {
    api
      .getCurrentSession()
      .then((data) => {
        setSession(data as Session | null);
      })
      .catch(() => {});
    api
      .getLatestCompleted()
      .then((data) => {
        setLastSession(data as Session | null);
      })
      .catch(() => {});
    api
      .getSessionTemplates()
      .then((data) => {
        setTemplates(data as SessionTemplate[]);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadCurrent();
  }, [loadCurrent]);

  const repeatLastSession = async () => {
    if (!lastSession) return;
    setRepeating(true);
    try {
      const data = (await api.duplicateSession(lastSession.id)) as Session;
      setSession(data);
    } catch {
      // ignore
    } finally {
      setRepeating(false);
    }
  };

  const useTemplate = async (templateId: string) => {
    setTemplateLoading(templateId);
    try {
      const data = (await api.useSessionTemplate(templateId)) as Session;
      setSession(data);
    } catch {
      // ignore
    } finally {
      setTemplateLoading(null);
    }
  };

  const deleteTemplate = async (templateId: string) => {
    try {
      await api.deleteSessionTemplate(templateId);
      setTemplates((prev) => prev.filter((t) => t.id !== templateId));
    } catch {
      // ignore
    }
  };

  const saveAsTemplate = async (sessionToSave: Session) => {
    if (!saveTemplateName.trim()) return;
    setSavingTemplate(true);
    try {
      const blocks = sessionToSave.blocks.map((b) => ({
        category: b.category,
        title: b.title,
        description: b.description,
        planned_duration_min: b.planned_duration_min,
        sort_order: b.sort_order,
        linked_type: b.linked_type || undefined,
        linked_id: b.linked_id || undefined,
        focus_points: b.focus_points || undefined,
      }));
      const data = (await api.saveSessionTemplate({
        name: saveTemplateName.trim(),
        planned_duration_min: sessionToSave.planned_duration_min,
        blocks,
      })) as SessionTemplate;
      setTemplates((prev) => [data, ...prev]);
      setShowSaveTemplate(false);
      setSaveTemplateName("");
    } catch {
      // ignore
    } finally {
      setSavingTemplate(false);
    }
  };

  // Timer
  useEffect(() => {
    if (timerRunning) {
      timerRef.current = setInterval(() => setTimer((t) => t + 1), 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerRunning]);

  const activeBlock = session?.blocks.find((b) => b.status === "active");
  const activeBlockTarget = activeBlock
    ? activeBlock.planned_duration_min * 60
    : 0;

  const generate = async () => {
    const data = (await api.generateSession(duration)) as Session;
    setSession(data);
  };

  const start = async () => {
    if (!session) return;
    const data = (await api.startSession(session.id)) as Session;
    setSession(data);
    setTimer(0);
    setTimerRunning(true);
  };

  const completeBlock = async (blockId: string) => {
    if (!session) return;
    const actualMin = Math.round(timer / 60) || 1;
    const data = (await api.completeBlock(session.id, blockId, {
      actual_duration_min: actualMin,
    })) as Session;
    setSession(data);
    setTimer(0);
    // If there's a next active block, keep timer running
    const nextActive = data.blocks.find((b) => b.status === "active");
    if (!nextActive) {
      setTimerRunning(false);
      setShowComplete(true);
    }
  };

  const skipBlock = async (blockId: string) => {
    if (!session) return;
    const data = (await api.skipBlock(session.id, blockId)) as Session;
    setSession(data);
    setTimer(0);
    const nextActive = data.blocks.find((b) => b.status === "active");
    if (!nextActive) {
      setTimerRunning(false);
      setShowComplete(true);
    }
  };

  const [selectedRating, setSelectedRating] = useState<string | null>(null);
  const [sessionNotes, setSessionNotes] = useState("");

  const finishSession = async () => {
    if (!session || !selectedRating) return;
    const data = (await api.completeSession(session.id, {
      rating: selectedRating,
      notes: sessionNotes,
    })) as Session;
    setSession(data);
    setShowComplete(false);
    setTimerRunning(false);
    setSelectedRating(null);
    setSessionNotes("");
  };

  // No session yet — generate one
  if (!session) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Practice Session</h1>
        <Card>
          <CardContent className="text-center py-12">
            <Clock
              size={48}
              className="mx-auto mb-4"
              style={{ color: "var(--pf-accent-gold)" }}
            />
            <h2 className="text-xl font-semibold mb-2">Plan your session</h2>
            <p className="text-[var(--pf-text-secondary)] mb-6">
              Choose your available time and the planner will build a structured
              session based on your pieces, exercises, and excerpt rotation.
            </p>
            <div className="flex items-center justify-center gap-2 sm:gap-4 mb-6 flex-wrap">
              {[30, 45, 60, 90, 120].map((m) => (
                <button
                  key={m}
                  onClick={() => setDuration(m)}
                  aria-pressed={duration === m}
                  className={`px-3 sm:px-4 py-2 rounded-pf text-sm font-medium transition-colors ${duration === m ? "text-white" : "text-[var(--pf-text-primary)] border border-[var(--pf-border-color)]"}`}
                  style={
                    duration === m
                      ? { backgroundColor: "var(--pf-accent-gold)" }
                      : undefined
                  }
                >
                  {m} min
                </button>
              ))}
            </div>
            <Button size="lg" onClick={generate}>
              <Sparkles size={18} /> Generate Session
            </Button>

            {lastSession &&
              lastSession.blocks &&
              lastSession.blocks.length > 0 && (
                <>
                  <div className="flex items-center gap-3 mt-6 mb-4">
                    <div className="flex-1 h-px bg-[var(--pf-border-color)]" />
                    <span className="text-xs text-[var(--pf-text-secondary)] uppercase tracking-wider">
                      or
                    </span>
                    <div className="flex-1 h-px bg-[var(--pf-border-color)]" />
                  </div>
                  <p className="text-sm text-[var(--pf-text-secondary)] mb-3">
                    {lastSession.planned_duration_min} min —{" "}
                    {lastSession.blocks
                      .map((b) => {
                        const conf = CATEGORY_CONFIG[b.category];
                        return conf ? conf.label : b.title;
                      })
                      .filter((v, i, a) => a.indexOf(v) === i)
                      .join(", ")}
                  </p>
                  <Button
                    variant="secondary"
                    onClick={repeatLastSession}
                    disabled={repeating}
                  >
                    <RotateCcw size={16} />{" "}
                    {repeating ? "Creating..." : "Repeat Last Session"}
                  </Button>
                </>
              )}

            {templates.length > 0 && (
              <>
                <div className="flex items-center gap-3 mt-6 mb-4">
                  <div className="flex-1 h-px bg-[var(--pf-border-color)]" />
                  <span className="text-xs text-[var(--pf-text-secondary)] uppercase tracking-wider flex items-center gap-1">
                    <FolderOpen size={12} /> Saved Templates
                  </span>
                  <div className="flex-1 h-px bg-[var(--pf-border-color)]" />
                </div>
                <div className="space-y-2 max-w-md mx-auto text-left">
                  {templates.map((t) => {
                    const categories = [
                      ...new Set(
                        t.blocks.map((b) => {
                          const conf = CATEGORY_CONFIG[b.category];
                          return conf ? conf.label : b.category;
                        }),
                      ),
                    ];
                    return (
                      <div
                        key={t.id}
                        className="flex items-center gap-3 p-3 rounded-pf border border-[var(--pf-border-color)] hover:border-[var(--pf-accent-gold)] transition-colors group"
                      >
                        <button
                          className="flex-1 text-left min-w-0"
                          onClick={() => useTemplate(t.id)}
                          disabled={templateLoading === t.id}
                        >
                          <div className="font-medium text-sm truncate">
                            {t.name}
                          </div>
                          <div className="text-xs text-[var(--pf-text-secondary)]">
                            {t.planned_duration_min} min —{" "}
                            {categories.join(", ")}
                          </div>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteTemplate(t.id);
                          }}
                          className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 transition-opacity p-1 rounded hover:bg-[var(--pf-bg-hover)]"
                          title="Delete template"
                          aria-label="Delete template"
                        >
                          <Trash2
                            size={14}
                            className="text-[var(--pf-text-secondary)]"
                          />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Completed session
  if (session.status === "completed") {
    const completed = session.blocks.filter(
      (b) => b.status === "completed",
    ).length;
    const skipped = session.blocks.filter((b) => b.status === "skipped").length;
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Session Complete</h1>
        <Card>
          <CardContent
            className="text-center py-10"
            role="status"
            aria-live="polite"
          >
            <CheckCircle
              size={56}
              className="mx-auto mb-4"
              style={{ color: "var(--pf-status-ready)" }}
            />
            <h2 className="text-xl font-semibold mb-2">Well done!</h2>
            <div className="flex justify-center gap-4 sm:gap-8 mb-4 text-sm">
              <div>
                <span className="text-2xl font-bold">
                  {session.actual_duration_min || session.planned_duration_min}
                </span>
                <br />
                <span className="text-[var(--pf-text-secondary)]">minutes</span>
              </div>
              <div>
                <span className="text-2xl font-bold">{completed}</span>
                <br />
                <span className="text-[var(--pf-text-secondary)]">
                  completed
                </span>
              </div>
              <div>
                <span className="text-2xl font-bold">{skipped}</span>
                <br />
                <span className="text-[var(--pf-text-secondary)]">skipped</span>
              </div>
            </div>
            {session.rating && (
              <Badge color="var(--pf-accent-gold)">{session.rating}</Badge>
            )}
            {session.notes && (
              <p className="text-sm text-[var(--pf-text-secondary)] mt-3 max-w-md mx-auto italic">
                "{session.notes}"
              </p>
            )}
            <div className="mt-6 flex flex-col items-center gap-3">
              {!showSaveTemplate ? (
                <Button
                  variant="secondary"
                  onClick={() => setShowSaveTemplate(true)}
                >
                  <Save size={16} /> Save as Template
                </Button>
              ) : (
                <div className="w-full max-w-sm space-y-2">
                  <input
                    type="text"
                    value={saveTemplateName}
                    onChange={(e) => setSaveTemplateName(e.target.value)}
                    placeholder="Template name, e.g. 'Audition Prep'"
                    className="w-full px-3 py-2 rounded-pf border border-[var(--pf-border-color)] bg-[var(--pf-bg-primary)] text-[var(--pf-text-primary)] text-sm focus:outline-none focus:border-[var(--pf-accent-gold)]"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveAsTemplate(session);
                    }}
                  />
                  <div className="flex gap-2 justify-center">
                    <Button
                      size="sm"
                      onClick={() => saveAsTemplate(session)}
                      disabled={!saveTemplateName.trim() || savingTemplate}
                    >
                      <Save size={14} /> {savingTemplate ? "Saving..." : "Save"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setShowSaveTemplate(false);
                        setSaveTemplateName("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
              <Button
                variant="secondary"
                onClick={() => {
                  setSession(null);
                  setShowSaveTemplate(false);
                  setSaveTemplateName("");
                }}
              >
                Plan New Session
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Rate session modal
  if (showComplete) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Rate Your Session</h1>
        <Card>
          <CardContent className="text-center py-10">
            <h2 className="text-xl font-semibold mb-6">How did it go?</h2>
            <div className="flex justify-center gap-3 sm:gap-6 mb-6">
              {[
                {
                  rating: "good",
                  icon: ThumbsUp,
                  label: "Good",
                  color: "var(--pf-status-ready)",
                },
                {
                  rating: "okay",
                  icon: Meh,
                  label: "Okay",
                  color: "var(--pf-accent-gold)",
                },
                {
                  rating: "bad",
                  icon: ThumbsDown,
                  label: "Tough",
                  color: "var(--pf-status-needs-work)",
                },
              ].map(({ rating, icon: Icon, label, color }) => (
                <button
                  key={rating}
                  onClick={() => setSelectedRating(rating)}
                  className={`flex flex-col items-center gap-1 sm:gap-2 px-4 py-4 sm:p-6 rounded-pf border-2 transition-colors ${
                    selectedRating === rating
                      ? "border-[var(--pf-accent-gold)] bg-[var(--pf-bg-hover)]"
                      : "border-[var(--pf-border-color)] hover:border-[var(--pf-accent-gold)]"
                  }`}
                >
                  <Icon size={28} className="sm:w-9 sm:h-9" style={{ color }} />
                  <span className="text-sm font-medium">{label}</span>
                </button>
              ))}
            </div>
            <div className="max-w-md mx-auto mb-6">
              <textarea
                value={sessionNotes}
                onChange={(e) => setSessionNotes(e.target.value)}
                placeholder="Session notes — what went well, what needs work"
                rows={3}
                className="w-full px-3 py-2 rounded-pf border border-[var(--pf-border-color)] bg-[var(--pf-bg-primary)] text-[var(--pf-text-primary)] text-sm resize-none focus:outline-none focus:border-[var(--pf-accent-gold)]"
              />
            </div>
            <Button
              size="lg"
              onClick={finishSession}
              disabled={!selectedRating}
            >
              <CheckCircle size={18} /> Finish Session
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Active session view
  const totalPlanned = session.blocks.reduce(
    (s, b) => s + b.planned_duration_min,
    0,
  );
  const completedMin = session.blocks
    .filter((b) => b.status === "completed")
    .reduce((s, b) => s + (b.actual_duration_min || b.planned_duration_min), 0);
  const isStarted = session.status === "in_progress";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Practice Session</h1>
        <span className="text-[var(--pf-text-secondary)]">
          {totalPlanned} minutes planned
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main block list */}
        <div className="lg:col-span-2 space-y-3">
          {/* Timer bar */}
          {isStarted && activeBlock && (
            <Card className="overflow-hidden">
              <div
                className="h-1"
                style={{
                  backgroundColor: "var(--pf-accent-gold)",
                  width: `${Math.min(100, (timer / activeBlockTarget) * 100)}%`,
                  transition: "width 1s linear",
                }}
              />
              <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between py-3 gap-2 sm:gap-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <div
                    className="text-3xl font-mono font-bold"
                    style={{
                      color:
                        timer > activeBlockTarget
                          ? "var(--pf-status-needs-work)"
                          : "var(--pf-text-primary)",
                    }}
                  >
                    {formatTime(timer)}
                  </div>
                  <span className="text-sm text-[var(--pf-text-secondary)]">
                    / {formatTime(activeBlockTarget)}
                  </span>
                  <span className="text-xs text-[var(--pf-text-secondary)] sm:ml-2 sm:border-l sm:border-[var(--pf-border-color)] sm:pl-3">
                    Total: {completedMin + Math.round(timer / 60)} min
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setTimerRunning(!timerRunning)}
                  >
                    {timerRunning ? <Square size={16} /> : <Play size={16} />}
                    {timerRunning ? "Pause" : "Resume"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Collapsible metronome panel */}
          {isStarted && activeBlock && (
            <Card>
              <button
                onClick={() => setMetronomeOpen(!metronomeOpen)}
                className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium text-[var(--pf-text-primary)] hover:bg-[var(--pf-bg-hover)] transition-colors rounded-pf"
              >
                <span className="flex items-center gap-2">
                  <Timer size={14} style={{ color: "var(--pf-accent-gold)" }} />
                  Metronome
                  {metronome.isPlaying && (
                    <span className="text-xs text-[var(--pf-text-secondary)]">
                      {metronome.bpm} BPM
                    </span>
                  )}
                </span>
                {metronomeOpen ? (
                  <ChevronUp size={14} />
                ) : (
                  <ChevronDown size={14} />
                )}
              </button>
              {metronomeOpen && (
                <CardContent className="pt-0 pb-3">
                  <MetronomeControls {...metronome} />
                </CardContent>
              )}
            </Card>
          )}

          {/* Start button */}
          {!isStarted && (
            <Card>
              <CardContent className="text-center py-6">
                <Button size="lg" onClick={start}>
                  <Play size={18} /> Start Session
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Blocks */}
          {session.blocks.map((block, i) => {
            const conf =
              CATEGORY_CONFIG[block.category] || CATEGORY_CONFIG.buffer;
            const Icon = conf.icon;
            const isActive = block.status === "active";
            const isCompleted = block.status === "completed";
            const isSkipped = block.status === "skipped";

            return (
              <Card
                key={block.id}
                borderColor={isActive ? conf.color : undefined}
                className={`transition-all ${isActive ? "ring-2 ring-[var(--pf-accent-gold)]/30" : ""} ${isCompleted || isSkipped ? "opacity-60" : ""}`}
              >
                <CardContent className="py-3">
                  <div className="flex items-start gap-3 sm:gap-4">
                    {/* Status icon */}
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{
                        backgroundColor: isCompleted
                          ? "var(--pf-status-ready)"
                          : isSkipped
                            ? "var(--pf-text-secondary)"
                            : `${conf.color}20`,
                        color: isCompleted
                          ? "white"
                          : isSkipped
                            ? "white"
                            : conf.color,
                      }}
                    >
                      {isCompleted ? (
                        <CheckCircle size={16} />
                      ) : isSkipped ? (
                        <SkipForward size={16} />
                      ) : (
                        <Icon size={16} />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span className="font-semibold text-sm">
                          {block.title}
                        </span>
                        <Badge color={conf.color}>{conf.label}</Badge>
                        <span className="text-xs text-[var(--pf-text-secondary)]">
                          {block.planned_duration_min} min
                        </span>
                      </div>
                      {block.description ? (
                        <p className="text-xs text-[var(--pf-text-secondary)]">
                          {block.description}
                        </p>
                      ) : (
                        <p className="text-xs text-[var(--pf-text-secondary)] italic">
                          {conf.hint}
                        </p>
                      )}
                      {block.focus_points && (
                        <p
                          className="text-xs mt-1"
                          style={{ color: conf.color }}
                        >
                          Focus: {block.focus_points}
                        </p>
                      )}
                      {isCompleted && block.actual_duration_min && (
                        <span className="text-xs text-[var(--pf-text-secondary)]">
                          Completed in {block.actual_duration_min} min
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions — below content on mobile, avoids overlap */}
                  {isActive && (
                    <div className="flex gap-2 mt-2 ml-11 sm:ml-12">
                      <Button
                        size="sm"
                        variant={recorderOpen ? "secondary" : "ghost"}
                        title="Record"
                        onClick={() => setRecorderOpen(!recorderOpen)}
                        style={
                          isRecording
                            ? { color: "var(--pf-status-needs-work)" }
                            : undefined
                        }
                      >
                        <Mic size={14} />
                      </Button>
                      <Button size="sm" onClick={() => completeBlock(block.id)}>
                        <CheckCircle size={14} /> Done
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => skipBlock(block.id)}
                      >
                        <SkipForward size={14} /> Skip
                      </Button>
                    </div>
                  )}

                  {/* Inline mini recorder */}
                  {isActive && recorderOpen && (
                    <div className="mt-3 p-3 rounded-pf border border-[var(--pf-border-color)] bg-[var(--pf-bg-hover)]">
                      {recSaved ? (
                        <div
                          className="flex items-center justify-center gap-2 text-sm"
                          style={{ color: "var(--pf-status-ready)" }}
                        >
                          <CheckCircle size={16} /> Saved
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          {!isRecording ? (
                            <button
                              onClick={startInlineRecording}
                              className="w-10 h-10 rounded-full flex items-center justify-center transition-transform hover:scale-105 flex-shrink-0"
                              style={{
                                backgroundColor: "var(--pf-status-needs-work)",
                              }}
                              title="Start recording"
                              aria-label="Start recording"
                            >
                              <Circle
                                size={16}
                                className="text-white fill-white"
                              />
                            </button>
                          ) : (
                            <button
                              onClick={() =>
                                stopInlineRecording(block, session)
                              }
                              className="w-10 h-10 rounded-full flex items-center justify-center transition-transform hover:scale-105 flex-shrink-0"
                              style={{
                                backgroundColor: "var(--pf-text-secondary)",
                              }}
                              title="Stop recording"
                              aria-label="Stop recording"
                            >
                              <Square
                                size={14}
                                className="text-white fill-white"
                              />
                            </button>
                          )}
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {isRecording && (
                              <span
                                className="w-2 h-2 rounded-full animate-pulse flex-shrink-0"
                                style={{
                                  backgroundColor:
                                    "var(--pf-status-needs-work)",
                                }}
                              />
                            )}
                            <span className="text-sm font-mono font-medium">
                              {formatTime(recDuration)}
                            </span>
                            {isRecording && (
                              <span className="text-xs text-[var(--pf-text-secondary)]">
                                Recording...
                              </span>
                            )}
                            {!isRecording && (
                              <span className="text-xs text-[var(--pf-text-secondary)]">
                                Tap to record
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                      {recError && (
                        <p
                          className="text-xs mt-2"
                          style={{ color: "var(--pf-status-needs-work)" }}
                        >
                          {recError}
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Time allocation */}
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold">Time Allocation</h2>
            </CardHeader>
            <CardContent className="space-y-2">
              {Object.entries(CATEGORY_CONFIG).map(([key, conf]) => {
                const catBlocks = session.blocks.filter(
                  (b) => b.category === key,
                );
                const catMin = catBlocks.reduce(
                  (s, b) => s + b.planned_duration_min,
                  0,
                );
                const pct =
                  totalPlanned > 0
                    ? Math.round((catMin / totalPlanned) * 100)
                    : 0;
                if (catMin === 0) return null;
                return (
                  <div key={key} className="flex items-center gap-2 text-sm">
                    <span className="w-24 text-[var(--pf-text-secondary)]">
                      {conf.label}
                    </span>
                    <div className="flex-1 h-2 bg-[var(--pf-bg-hover)] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: conf.color,
                        }}
                      />
                    </div>
                    <span className="w-12 text-right text-xs text-[var(--pf-text-secondary)]">
                      {catMin}m
                    </span>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Progress */}
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold">Progress</h2>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-[var(--pf-text-secondary)]">
                  Blocks completed
                </span>
                <span className="font-medium">
                  {
                    session.blocks.filter((b) => b.status === "completed")
                      .length
                  }{" "}
                  / {session.blocks.length}
                </span>
              </div>
              <div className="w-full h-3 bg-[var(--pf-bg-hover)] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${(session.blocks.filter((b) => b.status === "completed").length / session.blocks.length) * 100}%`,
                    backgroundColor: "var(--pf-status-ready)",
                    transitionDuration: "var(--pf-animation-duration)",
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
