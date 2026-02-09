"use client";

interface ComparisonTableProps {
  comparisons: {
    id: string;
    type: string;
    data: string;
    created_at: string;
  }[];
}

export default function ComparisonTable({ comparisons }: ComparisonTableProps) {
  if (comparisons.length === 0) {
    return <p className="text-muted text-sm">No comparisons yet.</p>;
  }

  return (
    <div className="space-y-4">
      {comparisons.map((comp) => {
        let parsed: Record<string, unknown> = {};
        try { parsed = JSON.parse(comp.data); } catch {}
        return (
          <div key={comp.id} className="bg-card border border-border rounded-lg p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold uppercase tracking-wider text-accent">{comp.type}</span>
              <span className="text-xs text-muted">{new Date(comp.created_at).toLocaleDateString()}</span>
            </div>
            <pre className="text-xs text-muted overflow-x-auto whitespace-pre-wrap">
              {JSON.stringify(parsed, null, 2)}
            </pre>
          </div>
        );
      })}
    </div>
  );
}
