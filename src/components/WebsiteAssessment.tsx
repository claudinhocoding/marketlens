"use client";

import { useState } from "react";

interface Opportunity {
  title: string;
  rationale: string;
  execution_requirements: string;
  risk: string;
  estimated_impact: string;
}

interface AssessmentData {
  opportunities: Opportunity[];
  summary: string;
}

interface WebsiteAssessmentProps {
  companyId: string;
  companyName: string;
  hasData: boolean;
}

export default function WebsiteAssessment({ companyId, companyName, hasData }: WebsiteAssessmentProps) {
  const [assessment, setAssessment] = useState<AssessmentData | null>(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "assessment", companyId }),
      });
      const data = await res.json();
      if (data.report?.content) {
        try {
          setAssessment(JSON.parse(data.report.content));
        } catch {
          setAssessment({ summary: data.report.content, opportunities: [] });
        }
      }
    } catch {} finally {
      setLoading(false);
    }
  };

  const downloadMd = () => {
    if (!assessment) return;
    let md = `# Website Assessment: ${companyName}\n\n${assessment.summary}\n\n`;
    for (const o of assessment.opportunities) {
      md += `## ${o.title}\n\n`;
      md += `**Rationale:** ${o.rationale}\n\n`;
      md += `**Execution Requirements:** ${o.execution_requirements}\n\n`;
      md += `**Risk:** ${o.risk}\n\n`;
      md += `**Estimated Impact:** ${o.estimated_impact}\n\n---\n\n`;
    }
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `assessment-${companyName.toLowerCase().replace(/\s+/g, "-")}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const riskColors: Record<string, string> = {
    Low: "text-success",
    Medium: "text-warning",
    High: "text-danger",
  };

  if (!hasData) {
    return (
      <div className="bg-card border border-border rounded-lg p-6 text-center text-muted">
        <p className="text-sm">Scrape and extract data first to generate an assessment.</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Website Assessment</h3>
        <div className="flex gap-2">
          {assessment && (
            <button onClick={downloadMd} className="bg-card border border-border hover:border-accent/30 text-sm px-3 py-1.5 rounded-lg">
              📥 Download .md
            </button>
          )}
          <button onClick={generate} disabled={loading} className="bg-accent hover:bg-accent-hover disabled:opacity-50 text-white px-4 py-1.5 rounded-lg text-sm font-medium">
            {loading ? "Generating…" : assessment ? "Regenerate" : "Generate Assessment"}
          </button>
        </div>
      </div>

      {!assessment ? (
        <p className="text-muted text-sm">Click Generate to create an AI assessment.</p>
      ) : (
        <>
          {assessment.summary && <p className="text-sm text-muted mb-4">{assessment.summary}</p>}
          <div className="space-y-4">
            {assessment.opportunities.map((o, i) => (
              <div key={i} className="border border-border rounded-lg p-4">
                <h4 className="font-semibold text-sm mb-2">{o.title}</h4>
                <p className="text-sm text-muted mb-2">{o.rationale}</p>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div><span className="text-muted">Execution:</span> <span>{o.execution_requirements}</span></div>
                  <div><span className="text-muted">Risk:</span> <span className={riskColors[o.risk] || "text-muted"}>{o.risk}</span></div>
                  <div><span className="text-muted">Impact:</span> <span className="text-accent">{o.estimated_impact}</span></div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
