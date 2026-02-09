"use client";

import { db } from "@/lib/db";
import { id } from "@instantdb/react";
import CompanyCard from "@/components/CompanyCard";
import { useState } from "react";

export default function Dashboard() {
  const { isLoading, error, data } = db.useQuery({
    companies: { features: {}, pricing_tiers: {}, marketing_intel: {} },
  });
  const [showAdd, setShowAdd] = useState(false);
  const [url, setUrl] = useState("");
  const [scraping, setScraping] = useState(false);

  if (isLoading) return <div className="text-muted py-20 text-center">Loading…</div>;
  if (error) return <div className="text-danger py-20 text-center">Error: {error.message}</div>;

  const companies = data.companies || [];
  const mine = companies.filter((c) => c.is_mine);
  const competitors = companies.filter((c) => !c.is_mine);

  const handleScrape = async () => {
    if (!url.trim()) return;
    setScraping(true);
    try {
      await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      setUrl("");
      setShowAdd(false);
    } catch {} finally {
      setScraping(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted text-sm mt-1">Track and analyze your competitive landscape</p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          + Add Company
        </button>
      </div>

      {showAdd && (
        <div className="bg-card border border-border rounded-lg p-5 mb-8">
          <h3 className="font-medium mb-3">Add a company to track</h3>
          <div className="flex gap-3">
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://competitor.com"
              className="flex-1 bg-background border border-border rounded-lg px-4 py-2 text-sm outline-none focus:border-accent"
            />
            <button
              onClick={handleScrape}
              disabled={scraping}
              className="bg-accent hover:bg-accent-hover disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-medium"
            >
              {scraping ? "Scraping…" : "Scrape & Add"}
            </button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Companies", value: companies.length },
          { label: "Your Companies", value: mine.length },
          { label: "Competitors", value: competitors.length },
          { label: "Total Features", value: companies.reduce((acc, c) => acc + (c.features?.length || 0), 0) },
        ].map((stat) => (
          <div key={stat.label} className="bg-card border border-border rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-accent">{stat.value}</div>
            <div className="text-xs text-muted mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      {mine.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Your Companies</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {mine.map((c) => (
              <CompanyCard key={c.id} {...c} featureCount={c.features?.length} />
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-lg font-semibold mb-4">Competitors</h2>
        {competitors.length === 0 ? (
          <p className="text-muted text-sm">No competitors tracked yet. Add one above!</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {competitors.map((c) => (
              <CompanyCard key={c.id} {...c} featureCount={c.features?.length} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
