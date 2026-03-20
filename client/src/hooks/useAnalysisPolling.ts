import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "../api/client";
import type { AnalysisStatus, OmrResult, AnalysisResult } from "../core/types";

export function useAnalysisPolling(fileId: string | undefined) {
  const [omrResult, setOmrResult] = useState<OmrResult | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(
    null,
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!fileId) return;
    try {
      const status = (await api.getAnalysisStatus(fileId)) as AnalysisStatus;
      setOmrResult(status.omr);
      setAnalysisResult(status.analysis);

      const processing =
        status.file?.processing_status === "processing" ||
        status.analysis?.status === "processing";
      setIsProcessing(processing);

      // Stop polling when nothing is processing
      if (!processing && intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    } catch {
      // File might not have any analysis yet
    }
  }, [fileId]);

  const startPolling = useCallback(() => {
    if (intervalRef.current) return;
    setIsProcessing(true);
    fetchStatus();
    intervalRef.current = setInterval(fetchStatus, 3000);
  }, [fetchStatus]);

  useEffect(() => {
    fetchStatus();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchStatus]);

  return {
    omrResult,
    analysisResult,
    isProcessing,
    startPolling,
    refresh: fetchStatus,
  };
}
