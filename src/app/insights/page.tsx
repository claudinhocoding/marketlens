"use client";

import { db } from "@/lib/db";
import PainPointsAnalysis from "@/components/PainPointsAnalysis";

export default function InsightsPage() {
  const { isLoading, error, data } = db.useQuery({ companies: {} });

  if (isLoading) return <div className="text-muted py-20 text-center">Loading…</div>;
  if (error) return <div className="text-danger py-20 text-center">Error: {error.message}</div>;

  const companies = data.companies || [];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Insights</h1>
        <p className="text-muted text-sm mt-1">Cross-company competitive insights and analysis</p>
      </div>
      <PainPointsAnalysis companyCount={companies.length} />
    </div>
  );
}
