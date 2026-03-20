import { useState, useRef, useCallback, useEffect } from "react";

type TimeSignature = "2/4" | "3/4" | "4/4" | "6/8";

function beatsPerMeasure(ts: TimeSignature): number {
  switch (ts) {
    case "2/4":
      return 2;
    case "3/4":
      return 3;
    case "4/4":
      return 4;
    case "6/8":
      return 6;
  }
}

export function useMetronome() {
  const [bpm, setBpm] = useState(120);
  const [timeSignature, setTimeSignature] = useState<TimeSignature>("4/4");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(0);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const nextNoteTimeRef = useRef(0);
  const currentBeatRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isPlayingRef = useRef(false);
  const tapTimesRef = useRef<number[]>([]);

  const getAudioContext = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
    }
    return audioCtxRef.current;
  }, []);

  const scheduleClick = useCallback(
    (time: number, isDownbeat: boolean) => {
      const ctx = getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.frequency.value = isDownbeat ? 800 : 600;
      osc.type = "sine";

      gain.gain.setValueAtTime(isDownbeat ? 0.5 : 0.3, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

      osc.start(time);
      osc.stop(time + 0.05);
    },
    [getAudioContext],
  );

  const scheduler = useCallback(() => {
    if (!isPlayingRef.current) return;

    const ctx = getAudioContext();
    const beats = beatsPerMeasure(timeSignature);
    const secondsPerBeat = 60.0 / bpm;
    const lookahead = 0.1; // schedule 100ms ahead

    while (nextNoteTimeRef.current < ctx.currentTime + lookahead) {
      const isDownbeat = currentBeatRef.current === 0;
      scheduleClick(nextNoteTimeRef.current, isDownbeat);

      const beat = currentBeatRef.current + 1;
      // Update UI beat on next tick
      setTimeout(
        () => setCurrentBeat(beat),
        Math.max(0, (nextNoteTimeRef.current - ctx.currentTime) * 1000),
      );

      currentBeatRef.current = (currentBeatRef.current + 1) % beats;
      nextNoteTimeRef.current += secondsPerBeat;
    }

    timerRef.current = setTimeout(scheduler, 25); // check every 25ms
  }, [bpm, timeSignature, getAudioContext, scheduleClick]);

  const start = useCallback(() => {
    const ctx = getAudioContext();
    if (ctx.state === "suspended") ctx.resume();

    isPlayingRef.current = true;
    currentBeatRef.current = 0;
    nextNoteTimeRef.current = ctx.currentTime;
    setCurrentBeat(0);
    setIsPlaying(true);
    scheduler();
  }, [getAudioContext, scheduler]);

  const stop = useCallback(() => {
    isPlayingRef.current = false;
    setIsPlaying(false);
    setCurrentBeat(0);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const tap = useCallback(() => {
    const now = performance.now();
    const taps = tapTimesRef.current;
    taps.push(now);

    // Keep only recent taps (within 2 seconds)
    const cutoff = now - 2000;
    tapTimesRef.current = taps.filter((t) => t > cutoff);

    if (tapTimesRef.current.length >= 2) {
      const intervals: number[] = [];
      for (let i = 1; i < tapTimesRef.current.length; i++) {
        intervals.push(tapTimesRef.current[i] - tapTimesRef.current[i - 1]);
      }
      const avgInterval =
        intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const newBpm = Math.round(60000 / avgInterval);
      setBpm(Math.max(30, Math.min(240, newBpm)));
    }
  }, []);

  // Restart scheduler when bpm/timeSignature changes while playing
  useEffect(() => {
    if (isPlayingRef.current) {
      if (timerRef.current) clearTimeout(timerRef.current);
      const ctx = getAudioContext();
      nextNoteTimeRef.current = ctx.currentTime;
      currentBeatRef.current = 0;
      scheduler();
    }
  }, [bpm, timeSignature, scheduler, getAudioContext]);

  // Cleanup
  useEffect(() => {
    return () => {
      isPlayingRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return {
    bpm,
    setBpm,
    timeSignature,
    setTimeSignature,
    isPlaying,
    currentBeat,
    beatsInMeasure: beatsPerMeasure(timeSignature),
    start,
    stop,
    tap,
  };
}
