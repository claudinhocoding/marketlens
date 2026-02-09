"use client";

import { useState } from "react";

type StatusLevel = "full" | "partial" | "none" | "unknown" | "likely";

interface Feature {
  name: string;
  category?: string;
  description?: string;
  status?: string;
  company?: { id: string; name: string };
}

interface FeatureMatrixProps {
  features: Feature[];
  companies: { id: string; name: string }[];
  onRefresh?: () => void;
}

const statusConfig: Record<StatusLevel, { icon: string; label: string; className: string }> = {
  full: { icon: "✅", label: "Full", className: "text-success" },
  partial: { icon: "🟡", label: "Partial", className: "text-warning" },
  none: { icon: "—", label: "None", className: "text-muted" },
  unknown: { icon: "?", label: "Unknown", className: "text-muted" },
  likely: { icon: "🟡", label: "Likely", className: "text-warning" },
};

function getStatus(has: boolean, statusStr?: string): StatusLevel {
  if (statusStr) {
    const s = statusStr.toLowerCase();
    if (s === "full" || s === "yes" || s === "true") return "full";
    if (s === "partial") return "partial";
    if (s === "likely") return "likely";
    if (s === "none" || s === "no" || s === "false") return "none";
    if (s === "unknown") return "unknown";
  }
  return has ? "full" : "none";
}

function exportCSV(features: Feature[], companies: { id: string; name: string }[], featuresByCategory: { category: string; features: string[] }[]) {
  const headers = ["Category", "Feature", ...companies.map(c => c.name)];
  const rows = featuresByCategory.flatMap(({ category, features: fnames }) =>
    fnames.map(fname => {
      const cols = companies.map(c => {
        const f = features.find(ff => ff.name === fname && ff.company?.id === c.id);
        const status = getStatus(!!f, f?.status);
        return statusConfig[status].label;
      });
      return [category, fname, ...cols];
    })
  );
  const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "feature-matrix.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function FeatureMatrix({ features, companies, onRefresh }: FeatureMatrixProps) {
  const [showLegend, setShowLegend] = useState(true);
  const categories = [...new Set(features.map((f) => f.category || "Uncategorized"))];
  const featuresByCategory = categories.map((cat) => ({
    category: cat,
    features: [...new Set(features.filter((f) => (f.category || "Uncategorized") === cat).map((f) => f.name))],
  }));

  return (
    <div>
      {/* Controls */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button onClick={() => setShowLegend(!showLegend)} className="text-xs text-muted hover:text-foreground">
            {showLegend ? "Hide" : "Show"} Legend
          </button>
        </div>
        <div className="flex gap-2">
          {onRefresh && (
            <button onClick={onRefresh} className="bg-card border border-border hover:border-accent/30 text-sm px-3 py-1.5 rounded-lg transition-colors">
              🔄 Refresh
            </button>
          )}
          <button onClick={() => exportCSV(features, companies, featuresByCategory)} className="bg-card border border-border hover:border-accent/30 text-sm px-3 py-1.5 rounded-lg transition-colors">
            📥 Export CSV
          </button>
        </div>
      </div>

      {/* Legend */}
      {showLegend && (
        <div className="flex gap-4 mb-4 text-xs text-muted bg-card border border-border rounded-lg px-4 py-2">
          {Object.entries(statusConfig).map(([key, { icon, label }]) => (
            <span key={key} className="flex items-center gap-1">
              <span>{icon}</span> {label}
            </span>
          ))}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-4 text-muted font-medium">Feature</th>
              {companies.map((c) => (
                <th key={c.id} className="text-center py-3 px-4 font-medium">{c.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {featuresByCategory.map(({ category, features: featureNames }) => (
              <>
                <tr key={category}>
                  <td colSpan={companies.length + 1} className="py-2 px-4 text-xs font-semibold text-accent uppercase tracking-wider bg-card">
                    {category}
                  </td>
                </tr>
                {featureNames.map((fname) => (
                  <tr key={fname} className="border-b border-border/50 hover:bg-card-hover">
                    <td className="py-2 px-4">{fname}</td>
                    {companies.map((c) => {
                      const f = features.find((ff) => ff.name === fname && ff.company?.id === c.id);
                      const status = getStatus(!!f, f?.status);
                      const cfg = statusConfig[status];
                      return (
                        <td key={c.id} className={`text-center py-2 px-4 ${cfg.className}`}>
                          {cfg.icon}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
