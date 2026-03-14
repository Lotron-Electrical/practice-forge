import { Button } from '../ui/Button';
import { Play, Square } from 'lucide-react';

interface Props {
  bpm: number;
  setBpm: (bpm: number) => void;
  timeSignature: '2/4' | '3/4' | '4/4' | '6/8';
  setTimeSignature: (ts: '2/4' | '3/4' | '4/4' | '6/8') => void;
  isPlaying: boolean;
  currentBeat: number;
  beatsInMeasure: number;
  start: () => void;
  stop: () => void;
  tap: () => void;
}

const TIME_SIGS: Array<'2/4' | '3/4' | '4/4' | '6/8'> = ['2/4', '3/4', '4/4', '6/8'];

export function MetronomeControls({
  bpm, setBpm, timeSignature, setTimeSignature,
  isPlaying, currentBeat, beatsInMeasure, start, stop, tap,
}: Props) {
  return (
    <div className="space-y-3">
      {/* BPM display */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-[var(--pf-text-secondary)]">Tempo</span>
        <span className="text-lg font-mono font-bold">{bpm} <span className="text-xs font-normal text-[var(--pf-text-secondary)]">BPM</span></span>
      </div>

      {/* BPM slider */}
      <input
        type="range"
        min={30}
        max={240}
        value={bpm}
        onChange={e => setBpm(parseInt(e.target.value))}
        className="w-full accent-[var(--pf-accent-gold)]"
      />

      {/* Time signature */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-[var(--pf-text-secondary)]">Time:</span>
        <div className="flex gap-1">
          {TIME_SIGS.map(ts => (
            <button
              key={ts}
              onClick={() => setTimeSignature(ts)}
              className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                timeSignature === ts
                  ? 'text-white'
                  : 'text-[var(--pf-text-secondary)] border border-[var(--pf-border-color)]'
              }`}
              style={timeSignature === ts ? { backgroundColor: 'var(--pf-accent-gold)' } : undefined}
            >
              {ts}
            </button>
          ))}
        </div>
      </div>

      {/* Beat indicator */}
      <div className="flex items-center justify-center gap-2">
        {Array.from({ length: beatsInMeasure }, (_, i) => (
          <div
            key={i}
            className="w-3 h-3 rounded-full transition-all"
            style={{
              backgroundColor: currentBeat === i + 1
                ? (i === 0 ? 'var(--pf-accent-gold)' : 'var(--pf-accent-teal)')
                : 'var(--pf-bg-hover)',
              transform: currentBeat === i + 1 ? 'scale(1.4)' : 'scale(1)',
            }}
          />
        ))}
      </div>

      {/* Play/Stop + Tap */}
      <div className="flex gap-2">
        <Button
          variant={isPlaying ? 'secondary' : 'primary'}
          size="sm"
          className="flex-1"
          onClick={isPlaying ? stop : start}
        >
          {isPlaying ? <><Square size={14} /> Stop</> : <><Play size={14} /> Start</>}
        </Button>
        <Button variant="ghost" size="sm" onClick={tap}>
          Tap
        </Button>
      </div>
    </div>
  );
}
