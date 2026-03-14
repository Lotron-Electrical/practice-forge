import { useState, useRef, useCallback } from 'react';
import type { PitchSample, BarResult } from '../core/types';

interface ExpectedNote {
  pitch: string; // e.g. "C5"
  midiNumber: number;
  bar: number;
  duration: number; // beats
}

const NOTE_TO_MIDI: Record<string, number> = {};
const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
for (let octave = 0; octave <= 8; octave++) {
  for (let i = 0; i < 12; i++) {
    NOTE_TO_MIDI[`${NAMES[i]}${octave}`] = octave * 12 + i + 12;
  }
}

function noteNameToMidi(name: string): number {
  return NOTE_TO_MIDI[name] ?? 0;
}

function frequencyToMidi(freq: number): number {
  return 69 + 12 * Math.log2(freq / 440);
}

function parseMusicXML(xml: string, startBar: number, endBar: number): ExpectedNote[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'text/xml');
  const measures = doc.querySelectorAll('measure');
  const notes: ExpectedNote[] = [];

  measures.forEach((measure) => {
    const barNum = parseInt(measure.getAttribute('number') || '0');
    if (barNum < startBar || barNum > endBar) return;

    measure.querySelectorAll('note').forEach((noteEl) => {
      // Skip rests
      if (noteEl.querySelector('rest')) return;
      // Skip chord notes (secondary)
      if (noteEl.querySelector('chord')) return;

      const pitch = noteEl.querySelector('pitch');
      if (!pitch) return;

      const step = pitch.querySelector('step')?.textContent || 'C';
      const octave = pitch.querySelector('octave')?.textContent || '4';
      const alter = parseInt(pitch.querySelector('alter')?.textContent || '0');

      let noteName = step;
      if (alter === 1) noteName += '#';
      else if (alter === -1) noteName += 'b';
      noteName += octave;

      // Normalize flats to sharps for MIDI
      const normalizedName = noteName
        .replace('Db', 'C#').replace('Eb', 'D#').replace('Gb', 'F#')
        .replace('Ab', 'G#').replace('Bb', 'A#');

      const durationEl = noteEl.querySelector('duration');
      const duration = parseFloat(durationEl?.textContent || '1');

      notes.push({
        pitch: normalizedName,
        midiNumber: noteNameToMidi(normalizedName),
        bar: barNum,
        duration,
      });
    });
  });

  return notes;
}

export function useScoreFollower(musicXmlUrl?: string, startBar = 1, endBar = 999) {
  const [currentBar, setCurrentBar] = useState<number | null>(null);
  const [expectedNote, setExpectedNote] = useState<string | null>(null);
  const [barResults, setBarResults] = useState<BarResult[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);

  const expectedNotesRef = useRef<ExpectedNote[]>([]);
  const currentIndexRef = useRef(0);
  const barHitsRef = useRef<Map<number, { matched: number; total: number }>>(new Map());
  const isFollowingRef = useRef(false);

  const loadScore = useCallback(async () => {
    if (!musicXmlUrl) return;
    try {
      const response = await fetch(musicXmlUrl);
      const xml = await response.text();
      expectedNotesRef.current = parseMusicXML(xml, startBar, endBar);

      // Initialize bar tracking
      const bars = new Set(expectedNotesRef.current.map(n => n.bar));
      barHitsRef.current = new Map();
      bars.forEach(bar => barHitsRef.current.set(bar, { matched: 0, total: 0 }));
      expectedNotesRef.current.forEach(n => {
        const entry = barHitsRef.current.get(n.bar);
        if (entry) entry.total++;
      });
    } catch {
      expectedNotesRef.current = [];
    }
  }, [musicXmlUrl, startBar, endBar]);

  const start = useCallback(async () => {
    await loadScore();
    currentIndexRef.current = 0;
    setIsFollowing(true);
    isFollowingRef.current = true;
    setBarResults([]);

    if (expectedNotesRef.current.length > 0) {
      const first = expectedNotesRef.current[0];
      setCurrentBar(first.bar);
      setExpectedNote(first.pitch);
    }
  }, [loadScore]);

  const stop = useCallback(() => {
    isFollowingRef.current = false;
    setIsFollowing(false);

    // Compute bar results
    const results: BarResult[] = [];
    barHitsRef.current.forEach((value, bar) => {
      const accuracy = value.total > 0 ? (value.matched / value.total) * 100 : 0;
      results.push({
        bar_number: bar,
        pitch_accuracy: Math.round(accuracy),
        rhythm_accuracy: 0, // not yet implemented — requires onset detection
        status: accuracy >= 80 ? 'accurate' : accuracy >= 50 ? 'minor_issues' : 'inaccurate',
      });
    });
    results.sort((a, b) => a.bar_number - b.bar_number);
    setBarResults(results);
    return results;
  }, []);

  // Feed pitch samples from useAudioEngine
  // Look-ahead: if the current expected note doesn't match, check up to 3 notes ahead
  // to recover from missed/extra notes
  const feedPitch = useCallback((sample: PitchSample) => {
    if (!isFollowingRef.current) return;
    const notes = expectedNotesRef.current;
    const idx = currentIndexRef.current;

    if (idx >= notes.length) return;

    const detectedMidi = frequencyToMidi(sample.frequency);
    const LOOK_AHEAD = 3;

    // Check current note and up to LOOK_AHEAD notes ahead
    for (let offset = 0; offset <= LOOK_AHEAD && idx + offset < notes.length; offset++) {
      const candidate = notes[idx + offset];
      if (Math.abs(detectedMidi - candidate.midiNumber) < 0.5) {
        // Match found — mark all skipped notes as missed, mark this one as hit
        for (let skip = 0; skip < offset; skip++) {
          // Skipped notes are not matched (already counted in total)
        }
        const entry = barHitsRef.current.get(candidate.bar);
        if (entry) entry.matched++;

        const newIdx = idx + offset + 1;
        currentIndexRef.current = newIdx;
        if (newIdx < notes.length) {
          const next = notes[newIdx];
          setCurrentBar(next.bar);
          setExpectedNote(next.pitch);
        } else {
          setExpectedNote(null);
        }
        return; // matched — stop looking
      }
    }
    // No match in look-ahead window — ignore this sample (extra note or noise)
  }, []);

  return {
    currentBar, expectedNote, barResults, isFollowing,
    start, stop, feedPitch, loadScore,
  };
}
