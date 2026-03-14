import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { AiCostConfirm } from '../components/ui/AiCostConfirm';
import { ScoreViewer } from '../components/score/ScoreViewer';
import { AnalysisToolbar } from '../components/score/AnalysisToolbar';
import { AnalysisSummaryPanel } from '../components/analysis/AnalysisSummaryPanel';
import { DemandsPanel } from '../components/analysis/DemandsPanel';
import { PatternsPanel } from '../components/analysis/PatternsPanel';
import { OmrReviewPanel } from '../components/analysis/OmrReviewPanel';
import { useAnalysisPolling } from '../hooks/useAnalysisPolling';
import { api } from '../api/client';
import type { UploadedFile, AnalysisDemand, Piece, HighlightMode } from '../core/types';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Loader, Sparkles, Mic } from 'lucide-react';

export function ScoreAnalysisPage() {
  const { fileId } = useParams<{ fileId: string }>();
  const [file, setFile] = useState<UploadedFile | null>(null);
  const [demands, setDemands] = useState<AnalysisDemand[]>([]);
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [highlightMode, setHighlightMode] = useState<HighlightMode>('none');
  const [showCostConfirm, setShowCostConfirm] = useState(false);
  const [estimatedCost, setEstimatedCost] = useState('');

  const navigate = useNavigate();
  const { omrResult, analysisResult, isProcessing, startPolling, refresh } = useAnalysisPolling(fileId);

  const loadFile = useCallback(async () => {
    if (!fileId) return;
    try {
      const f = await api.getFile(fileId) as UploadedFile;
      setFile(f);
    } catch { /* handled */ }
  }, [fileId]);

  const loadDemands = useCallback(async () => {
    if (!analysisResult?.id) return;
    try {
      const d = await api.getAnalysisDemands(analysisResult.id) as AnalysisDemand[];
      setDemands(d);
    } catch { /* handled */ }
  }, [analysisResult?.id]);

  useEffect(() => { loadFile(); }, [loadFile]);
  useEffect(() => { loadDemands(); }, [loadDemands]);
  useEffect(() => {
    api.getPieces().then(p => setPieces(p as Piece[])).catch(() => {});
  }, []);

  const handleTriggerOmr = async () => {
    if (!fileId) return;
    try {
      await api.triggerOmr(fileId);
      startPolling();
    } catch { /* handled */ }
  };

  const handleTriggerAnalysis = async () => {
    if (!fileId) return;
    try {
      await api.triggerAnalysis(fileId);
      startPolling();
    } catch { /* handled */ }
  };

  const handleClaudeEnhance = async () => {
    if (!analysisResult?.id) return;
    try {
      const result = await api.triggerClaudeEnhance(analysisResult.id) as { estimated_cost?: string; requires_confirmation?: boolean };
      if (result.requires_confirmation) {
        setEstimatedCost(result.estimated_cost || 'Unknown');
        setShowCostConfirm(true);
      }
    } catch { /* handled */ }
  };

  const confirmClaudeEnhance = async () => {
    if (!analysisResult?.id) return;
    setShowCostConfirm(false);
    try {
      await api.triggerClaudeEnhance(analysisResult.id, true);
      refresh();
    } catch { /* handled */ }
  };

  if (!file) return <div className="text-[var(--pf-text-secondary)]">Loading...</div>;

  const isScanned = file.file_type === 'sheet_music_scanned';
  const hasMusicXml = !isScanned || (omrResult && !omrResult.error_message);
  const needsOmr = isScanned && !omrResult;
  const needsOmrReview = isScanned && omrResult && !omrResult.error_message && file.processing_status === 'needs_review';
  const hasAnalysis = analysisResult && analysisResult.status === 'complete';

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-[var(--pf-text-secondary)] mb-4">
        <Link to="/media" className="hover:text-[var(--pf-text-primary)]">Media Library</Link>
        <ChevronRight size={14} />
        <span className="text-[var(--pf-text-primary)]">{file.original_filename}</span>
      </div>

      {/* Processing indicator */}
      {isProcessing && (
        <div className="flex items-center gap-2 p-3 mb-4 rounded-pf bg-[var(--pf-accent-teal)]/10 text-sm text-[var(--pf-accent-teal)]">
          <Loader size={16} className="animate-spin" />
          Processing...
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content area */}
        <div className="lg:col-span-2 space-y-4">
          {/* Action buttons for initial state */}
          {needsOmr && (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-[var(--pf-text-secondary)] mb-4">This is a scanned score. Run OMR to convert it to MusicXML.</p>
                <Button onClick={handleTriggerOmr}>Run OMR (Optical Music Recognition)</Button>
              </CardContent>
            </Card>
          )}

          {/* OMR Review */}
          {needsOmrReview && omrResult && (
            <OmrReviewPanel
              file={file}
              omrResult={omrResult}
              onAccept={handleTriggerAnalysis}
              onRerun={handleTriggerOmr}
            />
          )}

          {/* Score viewer */}
          {hasMusicXml && fileId && (
            <>
              {hasAnalysis && (
                <AnalysisToolbar
                  mode={highlightMode}
                  onChange={setHighlightMode}
                  counts={{
                    scales: analysisResult.analysis_data?.scales?.length || 0,
                    arpeggios: analysisResult.analysis_data?.arpeggios?.length || 0,
                    dynamics: analysisResult.analysis_data?.dynamics?.length || 0,
                  }}
                />
              )}
              <Card>
                <CardContent className="p-0 overflow-hidden">
                  <ScoreViewer
                    musicxmlUrl={api.getMusicXmlUrl(fileId)}
                    analysisData={hasAnalysis ? analysisResult.analysis_data : undefined}
                    highlightMode={highlightMode}
                  />
                </CardContent>
              </Card>
            </>
          )}

          {/* Practice with recording button */}
          {hasMusicXml && fileId && (
            <div className="flex justify-center">
              <Button variant="secondary" onClick={() => {
                const totalMeasures = analysisResult?.total_measures || 999;
                navigate(`/record?fileId=${fileId}&startBar=1&endBar=${totalMeasures}`);
              }}>
                <Mic size={14} /> Practice with recording
              </Button>
            </div>
          )}

          {/* Trigger analysis for digital files that haven't been analysed */}
          {!isScanned && !hasAnalysis && !isProcessing && (
            <div className="flex justify-center">
              <Button onClick={handleTriggerAnalysis}>Analyse Score</Button>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Analysis summary */}
          {hasAnalysis && <AnalysisSummaryPanel analysis={analysisResult} />}

          {/* Claude enhance button */}
          {hasAnalysis && !analysisResult.claude_analysis && (
            <Card>
              <CardContent className="text-center py-4">
                <Button variant="secondary" size="sm" onClick={handleClaudeEnhance}>
                  <Sparkles size={14} /> Flute-specific AI analysis
                </Button>
                <p className="text-xs text-[var(--pf-text-secondary)] mt-2">Uses Claude API (paid)</p>
              </CardContent>
            </Card>
          )}

          {/* Claude analysis results */}
          {analysisResult?.claude_analysis && (
            <Card>
              <CardContent className="space-y-3">
                <h3 className="text-base font-semibold flex items-center gap-2">
                  <Sparkles size={14} className="text-[var(--pf-accent-gold)]" /> Flute Analysis
                </h3>
                {analysisResult.claude_analysis.breathing_points?.length > 0 && (
                  <div>
                    <span className="text-xs font-medium text-[var(--pf-text-secondary)]">Breathing points</span>
                    <ul className="mt-1 space-y-1">
                      {analysisResult.claude_analysis.breathing_points.map((bp, i) => (
                        <li key={i} className="text-xs">m.{bp.measure} beat {bp.beat}: {bp.suggestion}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {analysisResult.claude_analysis.practice_suggestions?.length > 0 && (
                  <div>
                    <span className="text-xs font-medium text-[var(--pf-text-secondary)]">Practice suggestions</span>
                    <ul className="mt-1 space-y-1">
                      {analysisResult.claude_analysis.practice_suggestions.map((s, i) => (
                        <li key={i} className="text-xs">{s}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Demands panel */}
          {hasAnalysis && (
            <DemandsPanel demands={demands} pieces={pieces} onRefresh={loadDemands} />
          )}

          {/* Patterns panel */}
          {hasAnalysis && analysisResult.analysis_data && (
            <PatternsPanel data={analysisResult.analysis_data} />
          )}
        </div>
      </div>

      {/* Cost confirmation dialog */}
      {showCostConfirm && (
        <AiCostConfirm
          estimatedCost={estimatedCost}
          description="Run flute-specific AI analysis using Claude Sonnet"
          onConfirm={confirmClaudeEnhance}
          onCancel={() => setShowCostConfirm(false)}
        />
      )}
    </div>
  );
}
