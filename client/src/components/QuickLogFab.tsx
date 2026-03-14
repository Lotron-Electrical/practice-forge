import { useState, useEffect, useRef, useCallback } from 'react';
import { PenLine, X, ThumbsUp, Meh, ThumbsDown, CheckCircle, Loader } from 'lucide-react';
import { api } from '../api/client';
import { useModalLock } from '../hooks/useModalLock';

export function QuickLogFab() {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [duration, setDuration] = useState(30);
  const [rating, setRating] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Body scroll lock
  useModalLock(open);

  // Auto-focus textarea on open
  useEffect(() => {
    if (open && !success) {
      // Small delay to let the modal render
      const t = setTimeout(() => textareaRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open, success]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  const close = useCallback(() => {
    setOpen(false);
    setSuccess(false);
  }, []);

  const reset = () => {
    setNotes('');
    setDuration(30);
    setRating(null);
    setSuccess(false);
  };

  const handleSubmit = async () => {
    if (!notes.trim() || submitting) return;
    setSubmitting(true);
    try {
      await api.quickLog({ notes: notes.trim(), duration_min: duration, rating: rating || undefined });
      reset();
      setSuccess(true);
      setTimeout(() => { setOpen(false); setSuccess(false); }, 2000);
    } catch {
      /* ignore */
    }
    setSubmitting(false);
  };

  const ratings = [
    { value: 'good', icon: ThumbsUp, label: 'Good', color: 'var(--pf-status-ready)' },
    { value: 'okay', icon: Meh, label: 'Okay', color: 'var(--pf-accent-gold)' },
    { value: 'bad', icon: ThumbsDown, label: 'Tough', color: 'var(--pf-status-needs-work)' },
  ];

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center justify-center rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 active:scale-95 w-14 h-14 md:w-12 md:h-12"
        style={{
          backgroundColor: 'var(--pf-accent-gold)',
          color: '#1a1a2e',
        }}
        aria-label="Quick Log"
        title="Quick Log"
      >
        <PenLine size={22} className="md:w-5 md:h-5" />
      </button>

      {/* Modal backdrop + dialog */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          onClick={(e) => { if (e.target === e.currentTarget) close(); }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          {/* Modal */}
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Quick Log"
            className="relative w-full sm:max-w-md mx-auto sm:mx-4 rounded-t-2xl sm:rounded-2xl overflow-hidden"
            style={{ backgroundColor: 'var(--pf-bg-secondary)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--pf-border-color)' }}>
              <div className="flex items-center gap-2">
                <PenLine size={18} style={{ color: 'var(--pf-accent-gold)' }} />
                <h2 className="text-base font-semibold" style={{ color: 'var(--pf-text-primary)' }}>Quick Log</h2>
              </div>
              <button
                onClick={close}
                className="p-1.5 rounded-full hover:bg-white/10 transition-colors"
                style={{ color: 'var(--pf-text-secondary)' }}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="px-5 py-4">
              {success ? (
                <div role="status" aria-live="polite" className="flex items-center justify-center gap-2 py-6 text-sm font-medium" style={{ color: 'var(--pf-status-ready)' }}>
                  <CheckCircle size={20} /> Practice logged successfully
                </div>
              ) : (
                <div className="space-y-4">
                  <textarea
                    ref={textareaRef}
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="What did you practice?"
                    rows={3}
                    className="w-full px-3 py-2.5 rounded-lg border text-sm resize-none focus:outline-none transition-colors"
                    style={{
                      borderColor: 'var(--pf-border-color)',
                      backgroundColor: 'var(--pf-bg-primary)',
                      color: 'var(--pf-text-primary)',
                    }}
                    onFocus={e => e.target.style.borderColor = 'var(--pf-accent-gold)'}
                    onBlur={e => e.target.style.borderColor = 'var(--pf-border-color)'}
                  />

                  {/* Duration */}
                  <div className="flex items-center gap-2">
                    <label className="text-sm" style={{ color: 'var(--pf-text-secondary)' }}>Duration</label>
                    <input
                      type="number"
                      min={1}
                      value={duration}
                      onChange={e => setDuration(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-20 px-2 py-1.5 rounded-lg border text-sm focus:outline-none transition-colors"
                      style={{
                        borderColor: 'var(--pf-border-color)',
                        backgroundColor: 'var(--pf-bg-primary)',
                        color: 'var(--pf-text-primary)',
                      }}
                      onFocus={e => e.target.style.borderColor = 'var(--pf-accent-gold)'}
                      onBlur={e => e.target.style.borderColor = 'var(--pf-border-color)'}
                    />
                    <span className="text-sm" style={{ color: 'var(--pf-text-secondary)' }}>min</span>
                  </div>

                  {/* Rating */}
                  <div>
                    <label className="text-sm mb-2 block" style={{ color: 'var(--pf-text-secondary)' }}>How did it go?</label>
                    <div className="flex items-center gap-2">
                      {ratings.map(({ value, icon: Icon, label, color }) => (
                        <button
                          key={value}
                          onClick={() => setRating(rating === value ? null : value)}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors border"
                          style={{
                            borderColor: rating === value ? color : 'var(--pf-border-color)',
                            backgroundColor: rating === value ? `color-mix(in srgb, ${color} 12%, transparent)` : 'transparent',
                            color: rating === value ? color : 'var(--pf-text-secondary)',
                          }}
                        >
                          <Icon size={14} /> {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 justify-end pt-1">
                    <button
                      onClick={close}
                      className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                      style={{ color: 'var(--pf-text-secondary)' }}
                    >
                      Cancel
                    </button>
                    <button
                      disabled={submitting || !notes.trim()}
                      onClick={handleSubmit}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-40"
                      style={{
                        backgroundColor: 'var(--pf-accent-gold)',
                        color: '#1a1a2e',
                      }}
                    >
                      {submitting ? (
                        <><Loader size={14} className="animate-spin" /> Logging...</>
                      ) : (
                        <><CheckCircle size={14} /> Log Practice</>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
