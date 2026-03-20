import { useEffect, useRef, useState } from "react";
import { OpenSheetMusicDisplay as OSMD } from "opensheetmusicdisplay";
import type { AnalysisData, HighlightMode } from "../../core/types";
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

interface ScoreViewerProps {
  musicxmlUrl: string;
  analysisData?: AnalysisData;
  highlightMode?: HighlightMode;
}

export function ScoreViewer({
  musicxmlUrl,
  analysisData,
  highlightMode = "none",
}: ScoreViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const osmdRef = useRef<OSMD | null>(null);
  const [zoom, setZoom] = useState(1.0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const osmd = new OSMD(containerRef.current, {
      autoResize: true,
      drawTitle: true,
      drawComposer: true,
      drawCredits: true,
    });
    osmdRef.current = osmd;

    setLoading(true);
    setError(null);

    osmd
      .load(musicxmlUrl)
      .then(() => {
        osmd.zoom = zoom;
        osmd.render();
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message || "Failed to load score");
        setLoading(false);
      });

    return () => {
      osmdRef.current = null;
    };
  }, [musicxmlUrl]);

  useEffect(() => {
    if (!osmdRef.current) return;
    osmdRef.current.zoom = zoom;
    try {
      osmdRef.current.render();
    } catch {
      /* best effort */
    }
  }, [zoom]);

  // Apply highlight overlays when mode or data changes
  useEffect(() => {
    if (!osmdRef.current || !analysisData || highlightMode === "none") return;
    applyHighlights(osmdRef.current, analysisData, highlightMode);
  }, [highlightMode, analysisData]);

  return (
    <div className="relative">
      {/* Zoom controls */}
      <div className="absolute top-2 right-2 z-10 flex gap-1 bg-[var(--pf-bg-card)] border border-[var(--pf-border-color)] rounded-pf-sm p-1 shadow-pf">
        <button
          onClick={() => setZoom((z) => Math.max(0.3, z - 0.1))}
          className="p-1 hover:bg-[var(--pf-bg-hover)] rounded-pf-sm"
          title="Zoom out"
        >
          <ZoomOut size={16} className="text-[var(--pf-text-secondary)]" />
        </button>
        <span className="px-2 text-xs text-[var(--pf-text-secondary)] self-center">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => setZoom((z) => Math.min(3, z + 0.1))}
          className="p-1 hover:bg-[var(--pf-bg-hover)] rounded-pf-sm"
          title="Zoom in"
        >
          <ZoomIn size={16} className="text-[var(--pf-text-secondary)]" />
        </button>
        <button
          onClick={() => setZoom(1.0)}
          className="p-1 hover:bg-[var(--pf-bg-hover)] rounded-pf-sm"
          title="Reset zoom"
        >
          <RotateCcw size={14} className="text-[var(--pf-text-secondary)]" />
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20 text-[var(--pf-text-secondary)]">
          Loading score...
        </div>
      )}
      {error && (
        <div className="flex items-center justify-center py-20 text-[var(--pf-status-needs-work)]">
          {error}
        </div>
      )}
      <div
        ref={containerRef}
        className={loading ? "opacity-0" : "opacity-100 transition-opacity"}
      />
    </div>
  );
}

function applyHighlights(osmd: OSMD, data: AnalysisData, mode: HighlightMode) {
  // Reset any previous coloring by re-rendering
  try {
    // Parse bar ranges and colorize measures
    const measures = getMeasureRanges(data, mode);
    if (measures.length === 0) return;

    // OSMD doesn't have a direct measure coloring API, so we use CSS overlay approach
    const container = (osmd as unknown as { container: HTMLElement }).container;
    // Remove old overlays
    container
      .querySelectorAll(".pf-highlight-overlay")
      .forEach((el) => el.remove());

    // For now, we'll add a banner showing which measures are highlighted
    // Full measure-level SVG coloring can be refined later
  } catch {
    // Highlighting is best-effort
  }
}

function getMeasureRanges(
  data: AnalysisData,
  mode: HighlightMode,
): Array<{ start: number; end: number; color: string; label: string }> {
  const ranges: Array<{
    start: number;
    end: number;
    color: string;
    label: string;
  }> = [];

  if (mode === "scales") {
    for (const s of data.scales) {
      const [start, end] = parseBarRange(s.bar_range);
      ranges.push({
        start,
        end,
        color: "#3b82f6",
        label: `${s.key} ${s.scale_type}`,
      });
    }
  } else if (mode === "arpeggios") {
    for (const a of data.arpeggios) {
      const [start, end] = parseBarRange(a.bar_range);
      ranges.push({
        start,
        end,
        color: "#22c55e",
        label: `${a.key} ${a.chord_type}`,
      });
    }
  } else if (mode === "dynamics") {
    for (const d of data.dynamics) {
      ranges.push({
        start: d.measure,
        end: d.measure,
        color: "#a855f7",
        label: d.marking,
      });
    }
  }

  return ranges;
}

function parseBarRange(range: string): [number, number] {
  const parts = range.split("-").map(Number);
  return [parts[0] || 1, parts[1] || parts[0] || 1];
}
