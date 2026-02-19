"use client";

import { useState } from "react";
import { postApiJson } from "@/lib/api-client";

interface Company {
  id: string;
  name: string;
}

interface PositioningQuadrantProps {
  companies: Company[];
}

const axisOptions = ["Product Completeness", "Growth Momentum", "Market Reach", "Feature Depth"];
const quadrantLabels = [
  { label: "Rising Stars", x: "left", y: "top" },
  { label: "Market Leaders", x: "right", y: "top" },
  { label: "Early Stage", x: "left", y: "bottom" },
  { label: "Established", x: "right", y: "bottom" },
];

interface CompanyScore {
  name: string;
  x: number;
  y: number;
}

export default function PositioningQuadrant({ companies }: PositioningQuadrantProps) {
  const [xAxis, setXAxis] = useState(axisOptions[0]);
  const [yAxis, setYAxis] = useState(axisOptions[1]);
  const [scores, setScores] = useState<CompanyScore[]>([]);
  const [loading, setLoading] = useState(false);

  const analyze = async () => {
    setLoading(true);
    try {
      const res = await postApiJson("/api/compare", { type: "positioning", xAxis, yAxis });
      const data = await res.json();
      if (data.comparison?.positioning) {
        setScores(data.comparison.positioning);
      }
    } catch {} finally {
      setLoading(false);
    }
  };

  const colors = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#a855f7", "#06b6d4", "#f97316", "#ec4899"];

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-4">Market Positioning</h3>
      <div className="flex gap-3 mb-4 items-end">
        <div>
          <label className="text-xs text-muted block mb-1">X-Axis</label>
          <select value={xAxis} onChange={(e) => setXAxis(e.target.value)} className="bg-background border border-border rounded-lg px-3 py-1.5 text-sm outline-none">
            {axisOptions.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-muted block mb-1">Y-Axis</label>
          <select value={yAxis} onChange={(e) => setYAxis(e.target.value)} className="bg-background border border-border rounded-lg px-3 py-1.5 text-sm outline-none">
            {axisOptions.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        <button onClick={analyze} disabled={loading || companies.length < 2} className="bg-accent hover:bg-accent-hover disabled:opacity-50 text-white px-4 py-1.5 rounded-lg text-sm font-medium">
          {loading ? "Analyzing…" : "Analyze"}
        </button>
      </div>

      {/* Chart area */}
      <div className="relative w-full aspect-square max-w-lg mx-auto border border-border rounded-lg overflow-hidden bg-background">
        {/* Quadrant labels */}
        <div className="absolute top-2 left-2 text-xs text-muted/50">Rising Stars</div>
        <div className="absolute top-2 right-2 text-xs text-muted/50">Market Leaders</div>
        <div className="absolute bottom-2 left-2 text-xs text-muted/50">Early Stage</div>
        <div className="absolute bottom-2 right-2 text-xs text-muted/50">Established</div>

        {/* Grid lines */}
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border" />
        <div className="absolute top-1/2 left-0 right-0 h-px bg-border" />

        {/* Axis labels */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-xs text-muted pb-1">{xAxis}</div>
        <div className="absolute left-0 top-1/2 -translate-y-1/2 text-xs text-muted pl-1 -rotate-90 origin-left translate-x-3">{yAxis}</div>

        {/* Data points */}
        {scores.map((s, i) => (
          <div
            key={s.name}
            className="absolute flex flex-col items-center -translate-x-1/2 -translate-y-1/2 z-10"
            style={{ left: `${s.x * 100}%`, top: `${(1 - s.y) * 100}%` }}
          >
            <div
              className="w-4 h-4 rounded-full border-2 border-background"
              style={{ backgroundColor: colors[i % colors.length] }}
            />
            <span className="text-xs mt-0.5 whitespace-nowrap font-medium" style={{ color: colors[i % colors.length] }}>
              {s.name}
            </span>
          </div>
        ))}

        {scores.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-muted text-sm">
            Click Analyze to plot companies
          </div>
        )}
      </div>
    </div>
  );
}
