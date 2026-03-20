import { useEffect, useState } from "react";
import { Card, CardContent } from "../ui/Card";
import { Button } from "../ui/Button";
import { Textarea } from "../ui/Input";
import { DifficultyDots } from "../ui/DifficultyDots";
import { api } from "../../api/client";
import type { ExcerptCommunityData, CommunityNote } from "../../core/types";
import { ThumbsUp, MessageSquare, Loader } from "lucide-react";

interface Props {
  excerptId: string;
}

export function ExcerptCommunityPanel({ excerptId }: Props) {
  const [data, setData] = useState<ExcerptCommunityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRating, setUserRating] = useState<number | null>(null);
  const [noteText, setNoteText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const result = (await api.getExcerptCommunity(
        excerptId,
      )) as ExcerptCommunityData;
      setData(result);
      setUserRating(result.user_rating ?? null);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [excerptId]);

  const handleRate = async (rating: number) => {
    setUserRating(rating);
    try {
      await api.rateExcerpt(excerptId, rating);
      load();
    } catch {}
  };

  const handleAddNote = async () => {
    if (!noteText.trim()) return;
    setSubmitting(true);
    try {
      await api.addExcerptNote(excerptId, noteText.trim());
      setNoteText("");
      load();
    } catch {}
    setSubmitting(false);
  };

  const handleUpvote = async (noteId: string) => {
    try {
      await api.upvoteExcerptNote(noteId);
      load();
    } catch {}
  };

  if (loading) {
    return (
      <div className="flex justify-center py-4">
        <Loader
          size={16}
          className="animate-spin text-[var(--pf-accent-gold)]"
        />
      </div>
    );
  }

  if (!data) return null;

  const sortedNotes = [...data.notes].sort((a, b) => b.upvotes - a.upvotes);

  return (
    <Card>
      <CardContent className="space-y-4">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <MessageSquare size={14} style={{ color: "var(--pf-accent-teal)" }} />
          Community
        </h3>

        {/* Average difficulty */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-[var(--pf-text-secondary)]">
            Avg difficulty:
          </span>
          <DifficultyDots
            value={data.avg_difficulty ? Math.round(data.avg_difficulty) : null}
          />
          <span className="text-xs text-[var(--pf-text-secondary)]">
            ({data.rating_count} ratings)
          </span>
        </div>

        {/* Rate this */}
        <div>
          <span className="text-xs text-[var(--pf-text-secondary)] block mb-1">
            Rate difficulty:
          </span>
          <div className="flex gap-1">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                onClick={() => handleRate(n)}
                className="w-5 h-5 rounded-full transition-colors"
                style={{
                  backgroundColor:
                    userRating !== null && n <= userRating
                      ? "var(--pf-accent-gold)"
                      : "var(--pf-border-color)",
                }}
                title={`${n}/10`}
              />
            ))}
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <span className="text-xs font-medium text-[var(--pf-text-secondary)]">
            Tips & Notes
          </span>
          {sortedNotes.length === 0 ? (
            <p className="text-xs text-[var(--pf-text-secondary)]">
              No tips yet. Be the first to share one.
            </p>
          ) : (
            sortedNotes.map((note: CommunityNote) => (
              <div
                key={note.id}
                className="flex items-start gap-2 p-2 rounded-pf-sm bg-[var(--pf-bg-hover)]"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold">
                      {note.display_name}
                    </span>
                  </div>
                  <p className="text-xs mt-0.5">{note.note}</p>
                </div>
                <button
                  onClick={() => handleUpvote(note.id)}
                  className="flex items-center gap-1 text-xs text-[var(--pf-text-secondary)] hover:text-[var(--pf-accent-teal)] shrink-0"
                >
                  <ThumbsUp size={12} />
                  {note.upvotes}
                </button>
              </div>
            ))
          )}
        </div>

        {/* Add tip */}
        <div className="flex gap-2">
          <div className="flex-1">
            <Textarea
              placeholder="Share a tip for this excerpt..."
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
            />
          </div>
          <Button
            size="sm"
            onClick={handleAddNote}
            disabled={!noteText.trim() || submitting}
          >
            {submitting ? <Loader size={14} className="animate-spin" /> : "Add"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
