import { useState, useCallback, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { AudioVisualizer } from '../components/recording/AudioVisualizer';
import { RecordingControls } from '../components/recording/RecordingControls';
import { MetronomeControls } from '../components/recording/MetronomeControls';
import { PostPlayReport } from '../components/recording/PostPlayReport';
import { RecordingsList } from '../components/recording/RecordingsList';
import { ScorePlaybackOverlay } from '../components/recording/ScorePlaybackOverlay';
import { useAudioEngine, type RecordingResult } from '../hooks/useAudioEngine';
import { useMetronome } from '../hooks/useMetronome';
import { useScoreFollower } from '../hooks/useScoreFollower';
import { api } from '../api/client';
import { Mic, Music, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

type PageState = 'idle' | 'recording' | 'review' | 'saved';

export function RecordingPage() {
  const [searchParams] = useSearchParams();
  const linkedType = searchParams.get('linked_type') || undefined;
  const linkedId = searchParams.get('linked_id') || undefined;
  const sessionId = searchParams.get('session_id') || undefined;
  const blockId = searchParams.get('block_id') || undefined;
  const fileId = searchParams.get('fileId') || undefined;
  const initialStartBar = parseInt(searchParams.get('startBar') || '1');
  const initialEndBar = parseInt(searchParams.get('endBar') || '999');

  const [pageState, setPageState] = useState<PageState>('idle');
  const [result, setResult] = useState<RecordingResult | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [startBar, setStartBar] = useState(initialStartBar);
  const [endBar, setEndBar] = useState(initialEndBar);
  const [contextName, setContextName] = useState('');

  const isScoreAware = !!fileId;

  const engine = useAudioEngine();
  const metronome = useMetronome();
  const scoreFollower = useScoreFollower(
    isScoreAware ? api.getMusicXmlUrl(fileId) : undefined,
    startBar, endBar
  );

  // Feed pitch to score follower during recording
  const lastFedTimeRef = useRef(0);
  useEffect(() => {
    if (engine.isRecording && isScoreAware && engine.currentPitch && scoreFollower.isFollowing) {
      if (engine.currentPitch.time !== lastFedTimeRef.current) {
        lastFedTimeRef.current = engine.currentPitch.time;
        scoreFollower.feedPitch(engine.currentPitch);
      }
    }
  }, [engine.currentPitch, engine.isRecording, isScoreAware, scoreFollower]);

  // Load linked entity name for context
  useEffect(() => {
    if (linkedType && linkedId) {
      if (linkedType === 'piece') {
        api.getPiece(linkedId).then((p: any) => setContextName(p.title)).catch(() => {});
      } else if (linkedType === 'excerpt') {
        api.getExcerpt(linkedId).then((e: any) => setContextName(e.title)).catch(() => {});
      } else if (linkedType === 'exercise') {
        api.getExercise(linkedId).then((e: any) => setContextName(e.title)).catch(() => {});
      }
    }
  }, [linkedType, linkedId]);

  const handleStart = useCallback(async () => {
    await engine.startRecording();
    if (isScoreAware) {
      await scoreFollower.start();
    }
    setPageState('recording');
  }, [engine, isScoreAware, scoreFollower]);

  const handleStop = useCallback(async () => {
    const rec = await engine.stopRecording();
    let barResults;
    if (isScoreAware) {
      barResults = scoreFollower.stop();
    }
    setResult({ ...rec, analysis: { ...rec.analysis, bar_results: barResults } });
    metronome.stop();
    setPageState('review');
  }, [engine, isScoreAware, scoreFollower, metronome]);

  const handleSave = useCallback(async (title: string) => {
    if (!result) return;
    setIsSaving(true);
    try {
      const metadata: Record<string, string> = {
        filename: `recording-${Date.now()}.webm`,
        title: title || `Recording ${new Date().toLocaleString()}`,
        duration_seconds: String(result.duration),
      };
      if (linkedType) metadata.linked_type = linkedType;
      if (linkedId) metadata.linked_id = linkedId;
      if (sessionId) metadata.session_id = sessionId;
      if (blockId) metadata.block_id = blockId;
      if (fileId) metadata.score_file_id = fileId;
      if (metronome.bpm) metadata.target_bpm = String(metronome.bpm);
      if (startBar > 1) metadata.start_bar = String(startBar);
      if (endBar < 999) metadata.end_bar = String(endBar);

      const recording = await api.createRecording(result.audioBlob, metadata) as any;

      // Save analysis
      await api.saveAnalysis(recording.id, {
        pitch_accuracy_pct: result.summary.pitch_accuracy_pct,
        rhythm_accuracy_pct: null,
        dynamic_range_db: result.summary.dynamic_range_db,
        avg_rms: result.summary.avg_rms,
        avg_spectral_centroid: result.summary.avg_spectral_centroid,
        avg_spectral_flatness: result.summary.avg_spectral_flatness,
        pitch_stability: result.summary.pitch_stability,
        overall_rating: result.summary.overall_rating,
        analysis_data: result.analysis,
      });

      setPageState('saved');
      setRefreshKey(k => k + 1);
      setTimeout(() => setPageState('idle'), 2000);
    } catch {
      // Error handled silently
    } finally {
      setIsSaving(false);
    }
  }, [result, linkedType, linkedId, sessionId, blockId, fileId, metronome.bpm, startBar, endBar]);

  const handleDiscard = useCallback(() => {
    setResult(null);
    setPageState('idle');
  }, []);

  return (
    <div>
      {sessionId && (
        <div className="sticky top-0 z-10 -mx-4 px-4 py-2 mb-4 flex items-center gap-2 text-sm border-b border-[var(--pf-border-color)]" style={{ backgroundColor: 'var(--pf-bg-secondary)' }}>
          <Music size={14} style={{ color: 'var(--pf-accent-gold)' }} />
          <span className="text-[var(--pf-text-secondary)]">Recording for session</span>
          <span className="mx-1 text-[var(--pf-text-secondary)]">&mdash;</span>
          <Link to="/session" className="flex items-center gap-1 font-medium hover:underline" style={{ color: 'var(--pf-accent-gold)' }}>
            <ArrowLeft size={14} /> Back to Session
          </Link>
        </div>
      )}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Mic size={24} style={{ color: 'var(--pf-accent-gold)' }} />
          Record
        </h1>
        {contextName && (
          <span className="text-sm text-[var(--pf-text-secondary)] flex items-center gap-1">
            <Music size={14} /> {contextName}
          </span>
        )}
      </div>

      {pageState === 'saved' && (
        <div className="mb-4 p-3 rounded-pf text-sm text-center" style={{ backgroundColor: 'var(--pf-status-ready)', color: 'white' }}>
          Recording saved successfully
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main area */}
        <div className="lg:col-span-2 space-y-4">
          {pageState === 'idle' && !isScoreAware && (
            <Card>
              <CardContent className="text-center py-12">
                <Mic size={48} className="mx-auto mb-4" style={{ color: 'var(--pf-accent-gold)' }} />
                <h2 className="text-xl font-semibold mb-2">Audio Recording</h2>
                <p className="text-[var(--pf-text-secondary)] mb-2 max-w-md mx-auto">
                  Record yourself playing and get instant feedback on pitch accuracy, dynamics, and stability.
                </p>
                <p className="text-xs text-[var(--pf-text-secondary)]">
                  Optimised for flute (B3 — C7 range)
                </p>
              </CardContent>
            </Card>
          )}

          {pageState === 'idle' && isScoreAware && (
            <ScorePlaybackOverlay
              fileId={fileId!}
              startBar={startBar}
              endBar={endBar}
              onStartBarChange={setStartBar}
              onEndBarChange={setEndBar}
              currentBar={null}
              isRecording={false}
            />
          )}

          {pageState === 'recording' && !isScoreAware && (
            <AudioVisualizer
              currentPitch={engine.currentPitch}
              currentDynamics={engine.currentDynamics}
              pitchTrace={engine.pitchTrace}
              dynamicsEnvelope={engine.dynamicsEnvelope}
            />
          )}

          {pageState === 'recording' && isScoreAware && (
            <>
              <ScorePlaybackOverlay
                fileId={fileId!}
                startBar={startBar}
                endBar={endBar}
                onStartBarChange={setStartBar}
                onEndBarChange={setEndBar}
                currentBar={scoreFollower.currentBar}
                isRecording={true}
              />
              <AudioVisualizer
                currentPitch={engine.currentPitch}
                currentDynamics={engine.currentDynamics}
                pitchTrace={engine.pitchTrace}
                dynamicsEnvelope={engine.dynamicsEnvelope}
              />
            </>
          )}

          {pageState === 'review' && result && (
            <PostPlayReport
              duration={result.duration}
              audioBlob={result.audioBlob}
              summary={result.summary}
              analysis={result.analysis}
              barResults={result.analysis.bar_results}
              onSave={handleSave}
              onDiscard={handleDiscard}
              isSaving={isSaving}
            />
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Metronome */}
          <Card>
            <CardHeader><h2 className="text-sm font-semibold">Metronome</h2></CardHeader>
            <CardContent>
              <MetronomeControls {...metronome} />
            </CardContent>
          </Card>

          {/* Recording controls */}
          <Card>
            <CardHeader><h2 className="text-sm font-semibold">Recording</h2></CardHeader>
            <CardContent>
              <RecordingControls
                isRecording={engine.isRecording}
                isPaused={engine.isPaused}
                duration={engine.duration}
                permissionState={engine.permissionState}
                error={engine.error}
                onStart={handleStart}
                onStop={handleStop}
                onPause={engine.pauseRecording}
                onResume={engine.resumeRecording}
              />
            </CardContent>
          </Card>

          {/* Score follower info */}
          {isScoreAware && pageState === 'recording' && scoreFollower.expectedNote && (
            <Card>
              <CardContent className="text-center py-3">
                <div className="text-xs text-[var(--pf-text-secondary)]">Expected note</div>
                <div className="text-2xl font-mono font-bold" style={{ color: 'var(--pf-accent-teal)' }}>
                  {scoreFollower.expectedNote}
                </div>
                {scoreFollower.currentBar && (
                  <div className="text-xs text-[var(--pf-text-secondary)]">Bar {scoreFollower.currentBar}</div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Context card */}
          {contextName && (
            <Card>
              <CardContent className="py-3">
                <div className="text-xs text-[var(--pf-text-secondary)]">Recording for</div>
                <div className="text-sm font-medium">{contextName}</div>
                {linkedType && <div className="text-xs text-[var(--pf-text-secondary)]">{linkedType}</div>}
              </CardContent>
            </Card>
          )}

          {/* Recordings list */}
          <Card>
            <CardHeader><h2 className="text-sm font-semibold">Recent Recordings</h2></CardHeader>
            <CardContent>
              <RecordingsList
                linkedType={linkedType}
                linkedId={linkedId}
                refreshKey={refreshKey}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
