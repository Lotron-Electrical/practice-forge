import { useRef, useEffect } from 'react';
import type { PitchSample, DynamicsSample } from '../../core/types';

interface Props {
  currentPitch: PitchSample | null;
  currentDynamics: DynamicsSample | null;
  pitchTrace: PitchSample[];
  dynamicsEnvelope: DynamicsSample[];
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function getThemeColors(el: HTMLElement) {
  const style = getComputedStyle(el);
  return {
    good: style.getPropertyValue('--pf-status-ready').trim() || '#22c55e',
    warn: style.getPropertyValue('--pf-accent-gold').trim() || '#eab308',
    bad: style.getPropertyValue('--pf-status-needs-work').trim() || '#ef4444',
  };
}

function centsColor(cents: number, colors: { good: string; warn: string; bad: string }): string {
  const abs = Math.abs(cents);
  if (abs <= 15) return colors.good;
  if (abs <= 30) return colors.warn;
  return colors.bad;
}

function noteToY(note: string, canvasHeight: number): number {
  // Map notes from B3 to C7 (flute range) to canvas height
  const match = note.match(/^([A-G]#?)(\d)$/);
  if (!match) return canvasHeight / 2;
  const [, name, octStr] = match;
  const octave = parseInt(octStr);
  const noteIdx = NOTE_NAMES.indexOf(name);
  if (noteIdx === -1) return canvasHeight / 2;

  const midi = octave * 12 + noteIdx;
  const minMidi = 3 * 12 + 11; // B3
  const maxMidi = 7 * 12; // C7
  const range = maxMidi - minMidi;
  const normalized = (midi - minMidi) / range;
  return canvasHeight - (normalized * (canvasHeight - 40) + 20);
}

export function AudioVisualizer({ currentPitch, currentDynamics, pitchTrace, dynamicsEnvelope }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const themeColors = getThemeColors(canvas);

    const draw = () => {
      const { width, height } = canvas;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
      ctx.scale(dpr, dpr);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;

      // Background
      ctx.fillStyle = getComputedStyle(canvas).getPropertyValue('--pf-bg-secondary').trim() || '#1a1a2e';
      ctx.fillRect(0, 0, w, h);

      const pitchAreaWidth = w - 50; // Leave 50px for dynamics meter
      const pitchAreaHeight = h;

      // Draw note reference lines
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 1;
      const refNotes = ['C4', 'E4', 'G4', 'C5', 'E5', 'G5', 'C6', 'E6', 'G6', 'C7'];
      for (const rn of refNotes) {
        const y = noteToY(rn, pitchAreaHeight);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(pitchAreaWidth, y);
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.font = '9px monospace';
        ctx.fillText(rn, 2, y - 3);
      }

      // Draw pitch trace
      if (pitchTrace.length > 1) {
        const maxTime = pitchTrace[pitchTrace.length - 1].time;
        const minTime = maxTime - 10; // 10 second window

        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        for (let i = 1; i < pitchTrace.length; i++) {
          const prev = pitchTrace[i - 1];
          const curr = pitchTrace[i];
          if (prev.time < minTime) continue;

          const x1 = ((prev.time - minTime) / 10) * pitchAreaWidth;
          const y1 = noteToY(prev.note, pitchAreaHeight);
          const x2 = ((curr.time - minTime) / 10) * pitchAreaWidth;
          const y2 = noteToY(curr.note, pitchAreaHeight);

          ctx.strokeStyle = centsColor(curr.cents_deviation, themeColors);
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }
      }

      // Current note overlay
      if (currentPitch) {
        const noteY = noteToY(currentPitch.note, pitchAreaHeight);

        // Horizontal indicator
        ctx.strokeStyle = centsColor(currentPitch.cents_deviation, themeColors);
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(pitchAreaWidth - 80, noteY);
        ctx.lineTo(pitchAreaWidth, noteY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Note name
        ctx.fillStyle = centsColor(currentPitch.cents_deviation, themeColors);
        ctx.font = 'bold 20px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(currentPitch.note, pitchAreaWidth - 40, noteY - 15);

        // Cents deviation
        const sign = currentPitch.cents_deviation >= 0 ? '+' : '';
        ctx.font = '12px monospace';
        ctx.fillText(`${sign}${currentPitch.cents_deviation}c`, pitchAreaWidth - 40, noteY + 20);
        ctx.textAlign = 'left';
      }

      // Dynamics meter (right strip)
      const meterX = pitchAreaWidth + 8;
      const meterW = 30;
      const meterH = h - 20;

      // Meter background
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      ctx.fillRect(meterX, 10, meterW, meterH);

      if (currentDynamics) {
        // Normalize RMS (typical range 0 - 0.3)
        const level = Math.min(1, currentDynamics.rms / 0.15);
        const barH = level * meterH;

        const gradient = ctx.createLinearGradient(0, h - 10, 0, 10);
        gradient.addColorStop(0, '#22c55e');
        gradient.addColorStop(0.6, '#eab308');
        gradient.addColorStop(1, '#ef4444');

        ctx.fillStyle = gradient;
        ctx.fillRect(meterX, 10 + meterH - barH, meterW, barH);
      }

      // Label
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.font = '8px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('dB', meterX + meterW / 2, h - 2);
      ctx.textAlign = 'left';

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [currentPitch, currentDynamics, pitchTrace, dynamicsEnvelope]);

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label={currentPitch ? `Pitch visualizer — current note: ${currentPitch.note}, ${currentPitch.cents_deviation > 0 ? '+' : ''}${currentPitch.cents_deviation} cents` : 'Pitch visualizer — waiting for audio input'}
      className="w-full rounded-pf"
      style={{
        height: 280,
        ['--pf-bg-secondary' as string]: 'var(--pf-bg-secondary)',
      }}
    />
  );
}
