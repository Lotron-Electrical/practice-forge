import { Card, CardContent } from "../ui/Card";
import { Input } from "../ui/Input";
import { ScoreViewer } from "../score/ScoreViewer";
import { api } from "../../api/client";
import type { BarResult } from "../../core/types";

interface Props {
  fileId: string;
  startBar: number;
  endBar: number;
  onStartBarChange: (bar: number) => void;
  onEndBarChange: (bar: number) => void;
  currentBar: number | null;
  barResults?: BarResult[];
  isRecording: boolean;
}

export function ScorePlaybackOverlay({
  fileId,
  startBar,
  endBar,
  onStartBarChange,
  onEndBarChange,
  currentBar,
  barResults,
  isRecording,
}: Props) {
  return (
    <div className="space-y-3">
      {/* Bar range selector */}
      <div className="flex items-center gap-3">
        <Input
          label="Start bar"
          type="number"
          min={1}
          value={startBar}
          onChange={(e) => onStartBarChange(parseInt(e.target.value) || 1)}
          className="w-24"
        />
        <span className="text-[var(--pf-text-secondary)]">to</span>
        <Input
          label="End bar"
          type="number"
          min={startBar}
          value={endBar}
          onChange={(e) => onEndBarChange(parseInt(e.target.value) || startBar)}
          className="w-24"
        />
      </div>

      {/* Score with bar highlights */}
      <Card>
        <CardContent className="p-0 overflow-hidden relative">
          <ScoreViewer musicxmlUrl={api.getMusicXmlUrl(fileId)} />

          {/* Current bar indicator overlay */}
          {isRecording && currentBar && (
            <div
              className="absolute top-2 right-2 px-3 py-1 rounded-pf text-xs font-medium text-white"
              style={{ backgroundColor: "var(--pf-accent-gold)" }}
            >
              Bar {currentBar}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bar results grid after recording */}
      {barResults && barResults.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {barResults.map((bar) => (
            <div
              key={bar.bar_number}
              className="w-8 h-8 rounded flex items-center justify-center text-xs font-medium text-white"
              title={`Bar ${bar.bar_number}: ${bar.pitch_accuracy}%`}
              style={{
                backgroundColor:
                  bar.status === "accurate"
                    ? "#22c55e"
                    : bar.status === "minor_issues"
                      ? "#eab308"
                      : "#ef4444",
              }}
            >
              {bar.bar_number}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
