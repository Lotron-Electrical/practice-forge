import { Card, CardContent, CardHeader } from "../ui/Card";
import { Button } from "../ui/Button";
import type { OmrResult, UploadedFile } from "../../core/types";
import { CheckCircle, RefreshCw, AlertTriangle } from "lucide-react";

interface OmrReviewPanelProps {
  file: UploadedFile;
  omrResult: OmrResult;
  onAccept: () => void;
  onRerun: () => void;
}

export function OmrReviewPanel({
  file,
  omrResult,
  onAccept,
  onRerun,
}: OmrReviewPanelProps) {
  const confidence = omrResult.confidence
    ? Math.round(omrResult.confidence * 100)
    : null;
  const isLowConfidence = confidence !== null && confidence < 70;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold">OMR Review</h3>
          {confidence !== null && (
            <span
              className={`text-sm font-medium ${isLowConfidence ? "text-[var(--pf-accent-gold)]" : "text-[var(--pf-status-solid)]"}`}
            >
              {confidence}% confidence
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {omrResult.error_message ? (
          <div className="flex items-start gap-2 p-3 rounded-pf-sm bg-[var(--pf-status-needs-work)]/10">
            <AlertTriangle
              size={16}
              className="text-[var(--pf-status-needs-work)] mt-0.5"
            />
            <div>
              <p className="text-sm font-medium text-[var(--pf-status-needs-work)]">
                OMR Failed
              </p>
              <p className="text-xs text-[var(--pf-text-secondary)] mt-1">
                {omrResult.error_message}
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {omrResult.extracted_title && (
                <div>
                  <span className="text-[var(--pf-text-secondary)]">
                    Title:
                  </span>{" "}
                  {omrResult.extracted_title}
                </div>
              )}
              {omrResult.extracted_composer && (
                <div>
                  <span className="text-[var(--pf-text-secondary)]">
                    Composer:
                  </span>{" "}
                  {omrResult.extracted_composer}
                </div>
              )}
              {omrResult.page_count && (
                <div>
                  <span className="text-[var(--pf-text-secondary)]">
                    Pages:
                  </span>{" "}
                  {omrResult.page_count}
                </div>
              )}
              {omrResult.measure_count && (
                <div>
                  <span className="text-[var(--pf-text-secondary)]">
                    Measures:
                  </span>{" "}
                  {omrResult.measure_count}
                </div>
              )}
            </div>

            {isLowConfidence && (
              <div className="flex items-center gap-2 p-2 rounded-pf-sm bg-[var(--pf-accent-gold)]/10 text-xs text-[var(--pf-accent-gold)]">
                <AlertTriangle size={14} />
                Low confidence — review the rendered score carefully
              </div>
            )}
          </>
        )}

        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={onRerun}>
            <RefreshCw size={14} /> Re-run OMR
          </Button>
          {!omrResult.error_message && (
            <Button size="sm" onClick={onAccept}>
              <CheckCircle size={14} /> Accept &amp; Analyse
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
