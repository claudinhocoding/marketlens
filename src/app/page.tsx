"use client";

import { db } from "@/lib/db";
import { id } from "@instantdb/react";
import CompanyCard from "@/components/CompanyCard";
import { useState } from "react";

export default function Dashboard() {
  const { isLoading, error, data } = db.useQuery({
    companies: { features: {}, pricing_tiers: {}, marketing_intel: {}, social_profiles: {}, collections: {}, job_listings: {}, events: {} },
    collections: { companies: {} },
  });
  const [showAdd, setShowAdd] = useState(false);
  const [url, setUrl] = useState("");
  const [scraping, setScraping] = useState(false);
  const [depth, setDepth] = useState(1);
  const [newCollName, setNewCollName] = useState("");
  const [showNewColl, setShowNewColl] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const input = document.createElement("input");
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isLoading) return <div className="text-muted py-20 text-center">Loading…</div>;
  if (error) return <div className="text-danger py-20 text-center">Error: {error.message}</div>;

  const companies = data.companies || [];
  const collections = data.collections || [];

  const filteredCompanies = selectedCollection
    ? companies.filter((c) => c.collections?.some((col) => col.id === selectedCollection))
    : companies;
  const filteredMine = filteredCompanies.filter((c) => c.is_mine);
  const filteredCompetitors = filteredCompanies.filter((c) => !c.is_mine);

  const handleScrape = async () => {
    if (!url.trim()) return;
    setScraping(true);
    try {
      await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), depth }),
      });
      setUrl("");
      setShowAdd(false);
    } catch {} finally {
      setScraping(false);
    }
  };

  const createCollection = () => {
    if (!newCollName.trim()) return;
    const cid = id();
    db.transact(db.tx.collections[cid].update({ name: newCollName.trim(), description: "" }));
    setNewCollName("");
    setShowNewColl(false);
  };

  const addToCollection = (collectionId: string, companyId: string) => {
    db.transact(db.tx.collections[collectionId].link({ companies: companyId }));
  };

  const removeFromCollection = (collectionId: string, companyId: string) => {
    db.transact(db.tx.collections[collectionId].unlink({ companies: companyId }));
  };

  const setPrimaryCompany = (companyId: string) => {
    const txns = companies.map((company) =>
      db.tx.companies[company.id].update({ is_mine: company.id === companyId })
    );
    db.transact(txns);
  };

  const unsetPrimaryCompany = (companyId: string) => {
    db.transact(db.tx.companies[companyId].update({ is_mine: false }));
  };

  const maxSites = parseInt(process.env.NEXT_PUBLIC_MAX_SITES || "10", 10);

  return (
    <div className="flex gap-6">
      {/* Collections Sidebar */}
      <div className="w-56 shrink-0">
        <div className="bg-card border border-border rounded-lg p-4 sticky top-20">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Collections</h3>
            <button onClick={() => setShowNewColl(!showNewColl)} className="text-accent text-xs hover:underline">+ New</button>
          </div>
          {showNewColl && (
            <div className="mb-3 flex gap-1">
              <input value={newCollName} onChange={(e) => setNewCollName(e.target.value)} placeholder="Name" className="flex-1 bg-background border border-border rounded px-2 py-1 text-xs outline-none focus:border-accent" onKeyDown={(e) => e.key === "Enter" && createCollection()} />
              <button onClick={createCollection} className="bg-accent text-white text-xs px-2 py-1 rounded">Add</button>
            </div>
          )}
          <button onClick={() => setSelectedCollection(null)} className={`w-full text-left text-sm px-2 py-1.5 rounded transition-colors ${!selectedCollection ? "bg-accent/20 text-accent" : "text-muted hover:text-foreground"}`}>
            All Sites
          </button>
          {collections.map((col) => (
            <button key={col.id} onClick={() => setSelectedCollection(col.id)} className={`w-full text-left text-sm px-2 py-1.5 rounded transition-colors ${selectedCollection === col.id ? "bg-accent/20 text-accent" : "text-muted hover:text-foreground"}`}>
              {col.name} <span className="text-xs">({col.companies?.length || 0})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-muted text-sm mt-1">Track and analyze your competitive landscape</p>
          </div>
          <div className="flex gap-2">
            <button onClick={handleShare} className="bg-card border border-border hover:border-accent/30 text-sm px-4 py-2 rounded-lg transition-colors">
              {copied ? "✅ Copied!" : "🔗 Share"}
            </button>
            <button onClick={() => setShowAdd(!showAdd)} className="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              + Add Company
            </button>
          </div>
        </div>

        {showAdd && (
          <div className="bg-card border border-border rounded-lg p-5 mb-8">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium">Add a company to track</h3>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-border rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${companies.length >= maxSites ? "bg-danger" : companies.length >= maxSites * 0.8 ? "bg-warning" : "bg-accent"}`}
                      style={{ width: `${Math.min((companies.length / maxSites) * 100, 100)}%` }}
                    />
                  </div>
                  <span className={`text-xs font-medium ${companies.length >= maxSites ? "text-danger" : "text-muted"}`}>{companies.length} / {maxSites} sites used</span>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://competitor.com" className="flex-1 bg-background border border-border rounded-lg px-4 py-2 text-sm outline-none focus:border-accent" />
              <select value={depth} onChange={(e) => setDepth(Number(e.target.value))} className="bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none">
                {[1, 2, 3, 4, 5].map((d) => (
                  <option key={d} value={d}>Depth {d}</option>
                ))}
              </select>
              <button onClick={handleScrape} disabled={scraping || companies.length >= maxSites} className="bg-accent hover:bg-accent-hover disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-medium">
                {scraping ? "Scraping…" : "Scrape & Add"}
              </button>
            </div>
          </div>
        )}

        {/* Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {[
            { label: "Companies Tracked", value: companies.length, icon: "🏢" },
            { label: "Features Identified", value: companies.reduce((acc, c) => acc + (c.features?.length || 0), 0), icon: "⚡" },
            { label: "Open Jobs", value: companies.reduce((acc, c) => acc + (c.job_listings?.length || 0), 0), icon: "💼" },
            { label: "Events Tracked", value: companies.reduce((acc, c) => acc + (c.events?.length || 0), 0), icon: "📅" },
            { label: "Total Social Reach", value: companies.reduce((acc, c) => acc + (c.social_profiles || []).reduce((s: number, p: { followers_count?: number }) => s + (p.followers_count || 0), 0), 0), icon: "📣" },
          ].map((stat) => (
            <div key={stat.label} className="bg-card border border-border rounded-lg p-4 text-center">
              <div className="text-lg mb-1">{stat.icon}</div>
              <div className="text-2xl font-bold text-accent">{typeof stat.value === "number" && stat.value >= 1000 ? `${(stat.value / 1000).toFixed(1)}k` : stat.value}</div>
              <div className="text-xs text-muted mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        {companies.length > 0 && filteredMine.length === 0 && (
          <div className="mb-6 bg-card border border-border rounded-lg p-4 text-sm text-muted">
            No primary company selected yet. Use <span className="text-accent">⭐ Set as Primary</span> on a company card to define your baseline.
          </div>
        )}

        {/* Collection assignment dropdown for each company */}
        {filteredMine.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4">Your Companies</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMine.map((c) => (
                <div key={c.id}>
                  <CompanyCard {...c} featureCount={c.features?.length} thumbnailUrl={c.thumbnail_url} />
                  <div className="mt-1 flex gap-1 flex-wrap items-center">
                    <span className="text-xs px-2 py-0.5 rounded bg-accent/20 text-accent">✅ Primary</span>
                    <button
                      onClick={() => unsetPrimaryCompany(c.id)}
                      className="text-xs px-2 py-0.5 rounded bg-border text-muted hover:text-foreground transition-colors"
                    >
                      Unset
                    </button>
                    {collections.map((col) => {
                      const inCol = col.companies?.some((cc) => cc.id === c.id);
                      return (
                        <button key={col.id} onClick={() => inCol ? removeFromCollection(col.id, c.id) : addToCollection(col.id, c.id)} className={`text-xs px-2 py-0.5 rounded transition-colors ${inCol ? "bg-accent text-white" : "bg-border text-muted hover:text-foreground"}`}>
                          {col.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <h2 className="text-lg font-semibold mb-4">Competitors</h2>
          {filteredCompetitors.length === 0 ? (
            <p className="text-muted text-sm">No competitors tracked yet. Add one above!</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCompetitors.map((c) => (
                <div key={c.id}>
                  <CompanyCard {...c} featureCount={c.features?.length} thumbnailUrl={c.thumbnail_url} />
                  <div className="mt-1 flex gap-1 flex-wrap items-center">
                    <button
                      onClick={() => setPrimaryCompany(c.id)}
                      className="text-xs px-2 py-0.5 rounded bg-accent text-white hover:bg-accent-hover transition-colors"
                    >
                      ⭐ Set as Primary
                    </button>
                    {collections.map((col) => {
                      const inCol = col.companies?.some((cc) => cc.id === c.id);
                      return (
                        <button key={col.id} onClick={() => inCol ? removeFromCollection(col.id, c.id) : addToCollection(col.id, c.id)} className={`text-xs px-2 py-0.5 rounded transition-colors ${inCol ? "bg-accent text-white" : "bg-border text-muted hover:text-foreground"}`}>
                          {col.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
