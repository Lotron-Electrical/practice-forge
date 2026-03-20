import { useState, useRef, useCallback, useEffect } from "react";
import { PitchDetector } from "pitchy";
import Meyda from "meyda";
import type {
  PitchSample,
  DynamicsSample,
  ProblemSpot,
  DetectedNote,
  AudioAnalysisData,
} from "../core/types";

const NOTE_NAMES = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
];
const MIN_FREQ = 247; // B3 — low end for flute
const MAX_FREQ = 2093; // C7 — high end for flute
const CLARITY_THRESHOLD = 0.8;
const ANALYSIS_FPS = 10;

function frequencyToNote(freq: number): { note: string; cents: number } {
  const semitones = 12 * Math.log2(freq / 440);
  const rounded = Math.round(semitones);
  const cents = Math.round((semitones - rounded) * 100);
  const midi = rounded + 69;
  const noteIndex = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  return { note: `${NOTE_NAMES[noteIndex]}${octave}`, cents };
}

export interface RecordingResult {
  audioBlob: Blob;
  duration: number;
  analysis: AudioAnalysisData;
  summary: {
    pitch_accuracy_pct: number;
    dynamic_range_db: number;
    avg_rms: number;
    avg_spectral_centroid: number;
    avg_spectral_flatness: number;
    pitch_stability: number;
    overall_rating: "needs_work" | "acceptable" | "solid" | "excellent";
    problem_spots: ProblemSpot[];
    note_events: DetectedNote[];
  };
}

export function useAudioEngine() {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentPitch, setCurrentPitch] = useState<PitchSample | null>(null);
  const [currentDynamics, setCurrentDynamics] = useState<DynamicsSample | null>(
    null,
  );
  const [pitchTrace, setPitchTrace] = useState<PitchSample[]>([]);
  const [dynamicsEnvelope, setDynamicsEnvelope] = useState<DynamicsSample[]>(
    [],
  );
  const [permissionState, setPermissionState] = useState<
    "prompt" | "granted" | "denied"
  >("prompt");
  const [error, setError] = useState<string | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const meydaRef = useRef<ReturnType<typeof Meyda.createMeydaAnalyzer> | null>(
    null,
  );
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef(0);
  const pausedDurationRef = useRef(0);
  const pauseStartRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pitchTraceRef = useRef<PitchSample[]>([]);
  const dynamicsRef = useRef<DynamicsSample[]>([]);
  const lastAnalysisRef = useRef(0);
  const isPausedRef = useRef(false);
  const meydaFeaturesRef = useRef<{
    rms: number;
    spectralCentroid: number;
    spectralFlatness: number;
  }>({
    rms: 0,
    spectralCentroid: 0,
    spectralFlatness: 0,
  });

  // Check permission state on mount
  useEffect(() => {
    navigator.permissions
      ?.query({ name: "microphone" as PermissionName })
      .then((result) => {
        setPermissionState(result.state as "prompt" | "granted" | "denied");
      })
      .catch(() => {});
  }, []);

  const cleanup = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    if (meydaRef.current) {
      try {
        meydaRef.current.stop();
      } catch {}
    }
    if (streamRef.current)
      streamRef.current.getTracks().forEach((t) => t.stop());
    if (audioCtxRef.current?.state !== "closed") {
      try {
        audioCtxRef.current?.close();
      } catch {}
    }
    rafRef.current = null;
    timerRef.current = null;
    meydaRef.current = null;
    streamRef.current = null;
    audioCtxRef.current = null;
    analyserRef.current = null;
  }, []);

  const startRecording = useCallback(async () => {
    setError(null);
    pitchTraceRef.current = [];
    dynamicsRef.current = [];
    setPitchTrace([]);
    setDynamicsEnvelope([]);
    setCurrentPitch(null);
    setCurrentDynamics(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setPermissionState("granted");

      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 4096;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Meyda analyzer
      try {
        const meydaAnalyzer = Meyda.createMeydaAnalyzer({
          audioContext: audioCtx,
          source: source,
          bufferSize: 2048,
          featureExtractors: ["rms", "spectralCentroid", "spectralFlatness"],
          callback: (features: Record<string, number>) => {
            meydaFeaturesRef.current = {
              rms: features.rms || 0,
              spectralCentroid: features.spectralCentroid || 0,
              spectralFlatness: features.spectralFlatness || 0,
            };
          },
        });
        meydaAnalyzer.start();
        meydaRef.current = meydaAnalyzer;
      } catch {
        // Meyda is optional — continue without it
      }

      // Pitch detector
      const bufferSize = analyser.fftSize;
      const detector = PitchDetector.forFloat32Array(bufferSize);
      const inputBuffer = new Float32Array(bufferSize);

      // MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.start(100); // 100ms chunks
      recorderRef.current = recorder;

      startTimeRef.current = performance.now();
      pausedDurationRef.current = 0;
      setDuration(0);
      setIsRecording(true);
      setIsPaused(false);
      isPausedRef.current = false;

      // Duration timer
      timerRef.current = setInterval(() => {
        if (!isPausedRef.current) {
          const elapsed =
            (performance.now() -
              startTimeRef.current -
              pausedDurationRef.current) /
            1000;
          setDuration(elapsed);
        }
      }, 200);

      // Analysis loop
      const analysisLoop = () => {
        if (!analyserRef.current) return;

        const now = performance.now();
        if (
          now - lastAnalysisRef.current >= 1000 / ANALYSIS_FPS &&
          !isPausedRef.current
        ) {
          lastAnalysisRef.current = now;
          const elapsed =
            (now - startTimeRef.current - pausedDurationRef.current) / 1000;

          analyserRef.current.getFloatTimeDomainData(inputBuffer);
          const [pitch, clarity] = detector.findPitch(
            inputBuffer,
            audioCtx.sampleRate,
          );

          if (
            clarity >= CLARITY_THRESHOLD &&
            pitch >= MIN_FREQ &&
            pitch <= MAX_FREQ
          ) {
            const { note, cents } = frequencyToNote(pitch);
            const sample: PitchSample = {
              time: elapsed,
              frequency: pitch,
              note,
              cents_deviation: cents,
              clarity,
            };
            setCurrentPitch(sample);
            pitchTraceRef.current.push(sample);
            // Keep UI trace to last 10 seconds
            const recent = pitchTraceRef.current.filter(
              (s) => s.time > elapsed - 10,
            );
            setPitchTrace([...recent]);
          } else {
            setCurrentPitch(null);
          }

          const { rms, spectralCentroid, spectralFlatness } =
            meydaFeaturesRef.current;
          const dynSample: DynamicsSample = {
            time: elapsed,
            rms,
            spectral_centroid: spectralCentroid,
            spectral_flatness: spectralFlatness,
          };
          setCurrentDynamics(dynSample);
          dynamicsRef.current.push(dynSample);
          const recentDyn = dynamicsRef.current.filter(
            (s) => s.time > elapsed - 10,
          );
          setDynamicsEnvelope([...recentDyn]);
        }

        rafRef.current = requestAnimationFrame(analysisLoop);
      };

      rafRef.current = requestAnimationFrame(analysisLoop);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Microphone access denied";
      setError(msg);
      if (msg.includes("denied") || msg.includes("NotAllowed")) {
        setPermissionState("denied");
      }
    }
  }, []);

  const pauseRecording = useCallback(() => {
    isPausedRef.current = true;
    setIsPaused(true);
    pauseStartRef.current = performance.now();
    if (recorderRef.current?.state === "recording") recorderRef.current.pause();
  }, []);

  const resumeRecording = useCallback(() => {
    pausedDurationRef.current += performance.now() - pauseStartRef.current;
    isPausedRef.current = false;
    setIsPaused(false);
    if (recorderRef.current?.state === "paused") recorderRef.current.resume();
  }, []);

  const stopRecording = useCallback((): Promise<RecordingResult> => {
    return new Promise((resolve) => {
      setIsRecording(false);
      setIsPaused(false);
      isPausedRef.current = false;

      const finalDuration =
        (performance.now() - startTimeRef.current - pausedDurationRef.current) /
        1000;

      const recorder = recorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        recorder.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: recorder.mimeType });

          // Compute analysis
          const allPitch = pitchTraceRef.current;
          const allDynamics = dynamicsRef.current;

          // Pitch accuracy: % of samples within 20 cents
          const inTune = allPitch.filter(
            (s) => Math.abs(s.cents_deviation) <= 20,
          ).length;
          const pitchAccuracy =
            allPitch.length > 0 ? (inTune / allPitch.length) * 100 : 0;

          // Pitch stability: stddev of cents
          const centsMean =
            allPitch.reduce((s, p) => s + p.cents_deviation, 0) /
            (allPitch.length || 1);
          const centsVariance =
            allPitch.reduce(
              (s, p) => s + (p.cents_deviation - centsMean) ** 2,
              0,
            ) / (allPitch.length || 1);
          const pitchStability = Math.sqrt(centsVariance);

          // Dynamics
          const rmsValues = allDynamics.map((d) => d.rms).filter((v) => v > 0);
          const avgRms =
            rmsValues.reduce((a, b) => a + b, 0) / (rmsValues.length || 1);
          const maxRms = Math.max(...rmsValues, 0.001);
          const minRms = Math.min(
            ...rmsValues.filter((v) => v > 0.001),
            maxRms,
          );
          const dynamicRangeDb =
            20 * Math.log10(maxRms / Math.max(minRms, 0.0001));

          const avgSpectralCentroid =
            allDynamics.reduce((s, d) => s + d.spectral_centroid, 0) /
            (allDynamics.length || 1);
          const avgSpectralFlatness =
            allDynamics.reduce((s, d) => s + d.spectral_flatness, 0) /
            (allDynamics.length || 1);

          // Problem spots detection
          const problemSpots: ProblemSpot[] = [];
          let pitchProbStart: number | null = null;
          for (const sample of allPitch) {
            if (Math.abs(sample.cents_deviation) > 30) {
              if (pitchProbStart === null) pitchProbStart = sample.time;
            } else {
              if (
                pitchProbStart !== null &&
                sample.time - pitchProbStart > 0.3
              ) {
                problemSpots.push({
                  time_start: pitchProbStart,
                  time_end: sample.time,
                  type: "pitch",
                  description: "Pitch deviation >30 cents",
                  severity:
                    sample.time - pitchProbStart > 1 ? "major" : "moderate",
                });
              }
              pitchProbStart = null;
            }
          }

          // Dynamics dips
          for (let i = 1; i < allDynamics.length; i++) {
            if (allDynamics[i].rms < avgRms * 0.1 && allDynamics[i].rms > 0) {
              const start = allDynamics[i].time;
              let end = start;
              while (
                i < allDynamics.length &&
                allDynamics[i].rms < avgRms * 0.1
              ) {
                end = allDynamics[i].time;
                i++;
              }
              if (end - start > 0.5) {
                problemSpots.push({
                  time_start: start,
                  time_end: end,
                  type: "dynamics",
                  description: "Significant drop in volume",
                  severity: "minor",
                });
              }
            }
          }

          // Note events (simplified: group consecutive similar pitches)
          const noteEvents: DetectedNote[] = [];
          let currentNote: {
            freq: number;
            note: string;
            start: number;
            rmsSum: number;
            count: number;
          } | null = null;
          for (const sample of allPitch) {
            if (
              !currentNote ||
              Math.abs(12 * Math.log2(sample.frequency / currentNote.freq)) >
                0.5
            ) {
              if (currentNote) {
                noteEvents.push({
                  time: currentNote.start,
                  frequency: currentNote.freq,
                  note: currentNote.note,
                  duration: sample.time - currentNote.start,
                  velocity: currentNote.rmsSum / currentNote.count,
                });
              }
              currentNote = {
                freq: sample.frequency,
                note: sample.note,
                start: sample.time,
                rmsSum: 0,
                count: 0,
              };
            }
            const dynAtTime = allDynamics.find(
              (d) => Math.abs(d.time - sample.time) < 0.15,
            );
            if (dynAtTime && currentNote) {
              currentNote.rmsSum += dynAtTime.rms;
              currentNote.count++;
            }
          }
          if (currentNote) {
            noteEvents.push({
              time: currentNote.start,
              frequency: currentNote.freq,
              note: currentNote.note,
              duration: finalDuration - currentNote.start,
              velocity: currentNote.rmsSum / (currentNote.count || 1),
            });
          }

          // Overall rating
          let rating: "needs_work" | "acceptable" | "solid" | "excellent" =
            "needs_work";
          if (pitchAccuracy >= 90 && pitchStability < 10) rating = "excellent";
          else if (pitchAccuracy >= 75 && pitchStability < 20) rating = "solid";
          else if (pitchAccuracy >= 55) rating = "acceptable";

          cleanup();

          resolve({
            audioBlob: blob,
            duration: finalDuration,
            analysis: {
              pitch_trace: allPitch,
              dynamics_envelope: allDynamics,
              problem_spots: problemSpots,
              note_events: noteEvents,
            },
            summary: {
              pitch_accuracy_pct: Math.round(pitchAccuracy * 10) / 10,
              dynamic_range_db: Math.round(dynamicRangeDb * 10) / 10,
              avg_rms: avgRms,
              avg_spectral_centroid: avgSpectralCentroid,
              avg_spectral_flatness: avgSpectralFlatness,
              pitch_stability: Math.round(pitchStability * 10) / 10,
              overall_rating: rating,
              problem_spots: problemSpots,
              note_events: noteEvents,
            },
          });
        };
        recorder.stop();
      } else {
        cleanup();
        resolve({
          audioBlob: new Blob(),
          duration: 0,
          analysis: {
            pitch_trace: [],
            dynamics_envelope: [],
            problem_spots: [],
          },
          summary: {
            pitch_accuracy_pct: 0,
            dynamic_range_db: 0,
            avg_rms: 0,
            avg_spectral_centroid: 0,
            avg_spectral_flatness: 0,
            pitch_stability: 0,
            overall_rating: "needs_work",
            problem_spots: [],
            note_events: [],
          },
        });
      }
    });
  }, [cleanup]);

  // Cleanup on unmount
  useEffect(() => cleanup, [cleanup]);

  return {
    isRecording,
    isPaused,
    duration,
    currentPitch,
    currentDynamics,
    pitchTrace,
    dynamicsEnvelope,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    permissionState,
    error,
  };
}
