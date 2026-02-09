"use client";

import { db } from "@/lib/db";
import { useState } from "react";

export default function ReportsPage() {
  const { isLoading, error, data } = db.useQuery({ reports: {} });
  const [generating, setGenerating] = useState(false);
  const [reportType, setReportType] = useState("competitive_assessment");
  const [selected, setSelected] = useState<string | null>(null);

  if (isLoading) return <div className="text-muted py-20 text-center">Loading…</div>;
  if (error) return <div className="text-danger py-20 text-center">Error: {error.message}</div>;

  const reports = data.reports || [];
  const selectedReport = selected ? reports.find((r) => r.id === selected) : null;

  const generate = async () => {
    setGenerating(true);
    try {
      await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: reportType }),
      });
    } catch {} finally {
      setGenerating(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-muted text-sm mt-1">AI-generated competitive intelligence reports</p>
        </div>
        <div className="flex gap-3">
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className="bg-card border border-border rounded-lg px-3 py-2 text-sm outline-none"
          >
            <option value="competitive_assessment">Competitive Assessment</option>
            <option value="feature_gap">Feature Gap Analysis</option>
            <option value="market_positioning">Market Positioning</option>
          </select>
          <button onClick={generate} disabled={generating} className="bg-accent hover:bg-accent-hover disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium">
            {generating ? "Generating…" : "Generate Report"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-2">
          {reports.length === 0 ? (
            <p className="text-muted text-sm">No reports yet. Generate one!</p>
          ) : (
            reports.sort((a, b) => b.created_at.localeCompare(a.created_at)).map((r) => (
              <button
                key={r.id}
                onClick={() => setSelected(r.id)}
                className={`w-full text-left bg-card border rounded-lg p-4 transition-colors ${
                  selected === r.id ? "border-accent" : "border-border hover:border-accent/30"
                }`}
              >
                <h3 className="font-medium text-sm">{r.title}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs bg-border px-2 py-0.5 rounded">{r.type}</span>
                  <span className="text-xs text-muted">{new Date(r.created_at).toLocaleDateString()}</span>
                </div>
              </button>
            ))
          )}
        </div>
        <div className="lg:col-span-2">
          {selectedReport ? (
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-xl font-bold mb-1">{selectedReport.title}</h2>
              <div className="text-xs text-muted mb-4">{selectedReport.type} · {new Date(selectedReport.created_at).toLocaleDateString()}</div>
              <div className="prose prose-invert prose-sm max-w-none whitespace-pre-wrap text-sm">
                {selectedReport.content}
              </div>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-lg p-6 text-center text-muted py-20">
              Select a report to view
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
