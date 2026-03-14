import { Button } from '../ui/Button';
import { Circle, Square, Pause, Play, MicOff, Mic } from 'lucide-react';

interface Props {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  permissionState: 'prompt' | 'granted' | 'denied';
  error: string | null;
  onStart: () => void;
  onStop: () => void;
  onPause: () => void;
  onResume: () => void;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function RecordingControls({
  isRecording, isPaused, duration, permissionState, error,
  onStart, onStop, onPause, onResume,
}: Props) {
  return (
    <div className="space-y-4">
      {/* Timer */}
      <div className="text-center">
        <div className="text-4xl font-mono font-bold" style={{ color: isRecording ? 'var(--pf-status-needs-work)' : 'var(--pf-text-primary)' }}>
          {formatDuration(duration)}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3">
        {!isRecording ? (
          <button
            onClick={onStart}
            className="w-16 h-16 rounded-full flex items-center justify-center transition-transform hover:scale-105"
            style={{ backgroundColor: 'var(--pf-status-needs-work)' }}
            title="Record"
          >
            <Circle size={24} className="text-white fill-white" />
          </button>
        ) : (
          <>
            <Button variant="ghost" size="sm" onClick={isPaused ? onResume : onPause}>
              {isPaused ? <Play size={18} /> : <Pause size={18} />}
              {isPaused ? 'Resume' : 'Pause'}
            </Button>
            <button
              onClick={onStop}
              className="w-16 h-16 rounded-full flex items-center justify-center transition-transform hover:scale-105"
              style={{ backgroundColor: 'var(--pf-text-secondary)' }}
              title="Stop"
            >
              <Square size={20} className="text-white fill-white" />
            </button>
          </>
        )}
      </div>

      {/* Status indicator */}
      <div className="flex items-center justify-center gap-2 text-xs text-[var(--pf-text-secondary)]">
        {permissionState === 'denied' ? (
          <><MicOff size={12} className="text-[var(--pf-status-needs-work)]" /> Microphone blocked</>
        ) : permissionState === 'granted' ? (
          <><Mic size={12} className="text-[var(--pf-status-ready)]" /> Microphone ready</>
        ) : (
          <><Mic size={12} /> Click record to enable microphone</>
        )}
      </div>

      {isRecording && (
        <div className="flex items-center justify-center gap-2">
          <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: isPaused ? 'var(--pf-accent-gold)' : 'var(--pf-status-needs-work)' }} />
          <span className="text-xs text-[var(--pf-text-secondary)]">{isPaused ? 'Paused' : 'Recording'}</span>
        </div>
      )}

      {error && (
        <p className="text-xs text-center" style={{ color: 'var(--pf-status-needs-work)' }}>{error}</p>
      )}
    </div>
  );
}
