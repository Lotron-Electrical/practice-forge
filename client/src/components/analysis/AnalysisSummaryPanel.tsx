import { Card, CardContent, CardHeader } from "../ui/Card";
import { DifficultyDots } from "../ui/DifficultyDots";
import type { AnalysisResult } from "../../core/types";
import { Music, Clock, Gauge, ArrowUpDown } from "lucide-react";

interface AnalysisSummaryPanelProps {
  analysis: AnalysisResult;
}

export function AnalysisSummaryPanel({ analysis }: AnalysisSummaryPanelProps) {
  return (
    <Card>
      <CardHeader>
        <h3 className="text-base font-semibold">Analysis Summary</h3>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {analysis.key_signature && (
          <div className="flex items-center gap-2">
            <Music size={14} className="text-[var(--pf-text-secondary)]" />
            <span className="text-[var(--pf-text-secondary)]">Key</span>
            <span className="ml-auto font-medium">
              {analysis.key_signature}
            </span>
          </div>
        )}
        {analysis.time_signature && (
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-[var(--pf-text-secondary)]" />
            <span className="text-[var(--pf-text-secondary)]">Time</span>
            <span className="ml-auto font-medium">
              {analysis.time_signature}
            </span>
          </div>
        )}
        {analysis.tempo_marking && (
          <div className="flex items-center gap-2">
            <Gauge size={14} className="text-[var(--pf-text-secondary)]" />
            <span className="text-[var(--pf-text-secondary)]">Tempo</span>
            <span className="ml-auto font-medium">
              {analysis.tempo_marking}
            </span>
          </div>
        )}
        {analysis.difficulty_estimate && (
          <div className="flex items-center gap-2">
            <span className="text-[var(--pf-text-secondary)]">Difficulty</span>
            <span className="ml-auto">
              <DifficultyDots value={analysis.difficulty_estimate} />
            </span>
          </div>
        )}
        {(analysis.register_low || analysis.register_high) && (
          <div className="flex items-center gap-2">
            <ArrowUpDown
              size={14}
              className="text-[var(--pf-text-secondary)]"
            />
            <span className="text-[var(--pf-text-secondary)]">Register</span>
            <span className="ml-auto font-medium">
              {analysis.register_low} — {analysis.register_high}
            </span>
          </div>
        )}
        {analysis.total_measures && (
          <div className="flex items-center gap-2">
            <span className="text-[var(--pf-text-secondary)]">Measures</span>
            <span className="ml-auto font-medium">
              {analysis.total_measures}
            </span>
          </div>
        )}
        {analysis.analysis_data?.rhythm && (
          <div className="flex items-center gap-2">
            <span className="text-[var(--pf-text-secondary)]">
              Rhythm complexity
            </span>
            <span className="ml-auto font-medium">
              {analysis.analysis_data.rhythm.complexity_score}/10
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
