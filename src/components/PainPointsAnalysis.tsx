"use client";

import { useState } from "react";

interface PainPoint {
  text: string;
  category: string;
  addressed_by: string[];
}

interface PainPointsAnalysisProps {
  companyCount: number;
}

const categories = ["Automation", "Cost", "Quality", "Time", "Risk", "Other"];
const categoryColors: Record<string, string> = {
  Automation: "bg-blue-500/20 text-blue-400",
  Cost: "bg-green-500/20 text-green-400",
  Quality: "bg-purple-500/20 text-purple-400",
  Time: "bg-yellow-500/20 text-yellow-400",
  Risk: "bg-red-500/20 text-red-400",
  Other: "bg-gray-500/20 text-gray-400",
};
const categoryBarColors: Record<string, string> = {
  Automation: "bg-blue-500",
  Cost: "bg-green-500",
  Quality: "bg-purple-500",
  Time: "bg-yellow-500",
  Risk: "bg-red-500",
  Other: "bg-gray-500",
};

export default function PainPointsAnalysis({ companyCount }: PainPointsAnalysisProps) {
  const [painPoints, setPainPoints] = useState<PainPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyze = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "pain_points" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to analyze pain points.");
      }
      if (data.comparison?.painPoints?.pain_points) {
        setPainPoints(data.comparison.painPoints.pain_points);
      } else {
        setPainPoints([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to analyze pain points.");
    } finally {
      setLoading(false);
    }
  };

  const distribution = categories.map((cat) => ({
    category: cat,
    count: painPoints.filter((p) => p.category === cat).length,
  }));
  const totalPP = painPoints.length || 1;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold">Pain Points Analysis</h2>
          <p className="text-muted text-sm mt-1">Cross-company pain point identification and categorization</p>
        </div>
        <button onClick={analyze} disabled={loading} className="bg-accent hover:bg-accent-hover disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium">
          {loading ? "Analyzing…" : "Analyze Pain Points"}
        </button>
      </div>

      {error && <p className="text-danger text-sm mb-4">{error}</p>}

      {painPoints.length === 0 ? (
        <p className="text-muted text-sm">Click Analyze to identify pain points across companies.</p>
      ) : (
        <>
          {/* Distribution bar */}
          <div className="bg-card border border-border rounded-lg p-4 mb-6">
            <h4 className="text-sm font-semibold mb-3">Category Distribution</h4>
            <div className="flex h-6 rounded-full overflow-hidden">
              {distribution.filter((d) => d.count > 0).map((d) => (
                <div
                  key={d.category}
                  className={`${categoryBarColors[d.category]} flex items-center justify-center text-xs text-white font-medium`}
                  style={{ width: `${(d.count / totalPP) * 100}%` }}
                  title={`${d.category}: ${d.count}`}
                >
                  {d.count > 1 ? d.category : ""}
                </div>
              ))}
            </div>
            <div className="flex gap-4 mt-2 flex-wrap">
              {distribution.filter((d) => d.count > 0).map((d) => (
                <span key={d.category} className="text-xs text-muted">
                  <span className={`inline-block w-2 h-2 rounded-full ${categoryBarColors[d.category]} mr-1`} />
                  {d.category} ({d.count})
                </span>
              ))}
            </div>
          </div>

          {/* Pain points list */}
          <div className="space-y-2">
            {painPoints.map((p, i) => (
              <div key={i} className="bg-card border border-border rounded-lg p-4 flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${categoryColors[p.category] || categoryColors.Other}`}>
                      {p.category}
                    </span>
                    <span className="text-sm font-medium">{p.text}</span>
                  </div>
                </div>
                <div className="text-xs text-muted whitespace-nowrap ml-4">
                  {p.addressed_by.length}/{companyCount} companies
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
