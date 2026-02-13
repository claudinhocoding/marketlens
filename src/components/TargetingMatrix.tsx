"use client";

import { useState } from "react";

interface Company {
  id: string;
  name: string;
}

interface TargetingMatrixProps {
  companies: Company[];
}

interface MatrixData {
  verticals: string[];
  ratings: Record<string, Record<string, string>>;
}

const ratingColors: Record<string, string> = {
  HIGH: "bg-success/80 text-white",
  MEDIUM: "bg-warning/80 text-white",
  LOW: "bg-danger/30 text-foreground",
  NONE: "bg-border text-muted",
};

export default function TargetingMatrix({ companies }: TargetingMatrixProps) {
  const [data, setData] = useState<MatrixData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyze = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "targeting_matrix" }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.error || "Failed to generate targeting matrix.");
      }
      if (json.comparison?.targetingMatrix) {
        setData(json.comparison.targetingMatrix);
      } else {
        setData(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate targeting matrix.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Targeting Matrix</h3>
        <button onClick={analyze} disabled={loading || companies.length < 2} className="bg-accent hover:bg-accent-hover disabled:opacity-50 text-white px-4 py-1.5 rounded-lg text-sm font-medium">
          {loading ? "Analyzing…" : "Analyze Verticals"}
        </button>
      </div>

      {error && <p className="text-danger text-sm mb-4">{error}</p>}

      {!data ? (
        <p className="text-muted text-sm">Click Analyze to generate targeting matrix.</p>
      ) : (
        <>
          <div className="overflow-x-auto mb-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-muted font-medium">Vertical</th>
                  {companies.map((c) => (
                    <th key={c.id} className="text-center py-3 px-4 font-medium">{c.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.verticals.map((v) => (
                  <tr key={v} className="border-b border-border/50">
                    <td className="py-2 px-4 font-medium">{v}</td>
                    {companies.map((c) => {
                      const rating = data.ratings[v]?.[c.name] || "NONE";
                      return (
                        <td key={c.id} className="text-center py-2 px-4">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${ratingColors[rating] || ratingColors.NONE}`}>
                            {rating}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Vertical Whitespace */}
          <h4 className="text-sm font-semibold mb-3 text-muted uppercase tracking-wider">Vertical Whitespace</h4>
          <div className="space-y-3">
            {data.verticals.map((v) => {
              const companyCount = companies.filter((c) => {
                const r = data.ratings[v]?.[c.name];
                return r === "HIGH" || r === "MEDIUM";
              }).length;
              const opportunity = Math.round(((companies.length - companyCount) / companies.length) * 100);
              return (
                <div key={v}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span>{v}</span>
                    <span className="text-muted text-xs">{companyCount} of {companies.length} companies · {opportunity}% opportunity</span>
                  </div>
                  <div className="w-full h-2 bg-border rounded-full overflow-hidden">
                    <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${opportunity}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
