"use client";

import { db } from "@/lib/db";
import { postApiJson } from "@/lib/api-client";
import { useState } from "react";
import FeatureMatrix from "@/components/FeatureMatrix";
import TargetingHeatmap from "@/components/TargetingHeatmap";
import ComparisonTable from "@/components/ComparisonTable";
import PositioningQuadrant from "@/components/PositioningQuadrant";
import TargetingMatrix from "@/components/TargetingMatrix";

export default function ComparePage() {
  const { isLoading, error, data } = db.useQuery({
    companies: { features: {}, marketing_intel: {} },
    comparisons: {},
  });
  const [running, setRunning] = useState(false);
  const [tab, setTab] = useState<"features" | "marketing" | "saved">("features");

  if (isLoading) return <div className="text-muted py-20 text-center">Loading…</div>;
  if (error) return <div className="text-danger py-20 text-center">Error: {error.message}</div>;

  const companies = data.companies || [];
  const comparisons = data.comparisons || [];

  const allFeatures = companies.flatMap((c) =>
    (c.features || []).map((f) => ({ ...f, company: { id: c.id, name: c.name } }))
  );
  const allMarketing = companies.flatMap((c) =>
    (c.marketing_intel || []).map((m) => ({ ...m, company: { id: c.id, name: c.name } }))
  );

  const runComparison = async () => {
    setRunning(true);
    try {
      await postApiJson("/api/compare", {});
    } catch {} finally {
      setRunning(false);
    }
  };

  const tabs = [
    { key: "features" as const, label: "Feature Matrix" },
    { key: "marketing" as const, label: "Marketing & Targeting" },
    { key: "saved" as const, label: "Saved Comparisons" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Compare</h1>
          <p className="text-muted text-sm mt-1">Analyze competitive positioning across companies</p>
        </div>
        <button onClick={runComparison} disabled={running} className="bg-accent hover:bg-accent-hover disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium">
          {running ? "Running…" : "Run Comparison"}
        </button>
      </div>

      <div className="flex gap-1 mb-6 bg-card border border-border rounded-lg p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2 text-sm rounded-md transition-colors ${tab === t.key ? "bg-accent text-white" : "text-muted hover:text-foreground"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "features" && (
        companies.length >= 2 ? (
          <FeatureMatrix features={allFeatures} companies={companies.map((c) => ({ id: c.id, name: c.name }))} />
        ) : (
          <p className="text-muted text-sm">Add at least 2 companies to compare features.</p>
        )
      )}

      {tab === "marketing" && (
        companies.length >= 2 ? (
          <TargetingHeatmap intel={allMarketing} companies={companies.map((c) => ({ id: c.id, name: c.name }))} />
        ) : (
          <p className="text-muted text-sm">Add at least 2 companies to compare marketing.</p>
        )
      )}

      {tab === "marketing" && companies.length >= 2 && (
        <div className="mt-6 space-y-6">
          <PositioningQuadrant companies={companies.map((c) => ({ id: c.id, name: c.name }))} />
          <TargetingMatrix companies={companies.map((c) => ({ id: c.id, name: c.name }))} />
        </div>
      )}

      {tab === "saved" && <ComparisonTable comparisons={comparisons} />}
    </div>
  );
}
