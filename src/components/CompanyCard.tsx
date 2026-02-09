"use client";

import Link from "next/link";

interface CompanyCardProps {
  id: string;
  name: string;
  url: string;
  description?: string;
  industry?: string;
  is_mine: boolean;
  scraped_at?: string;
  featureCount?: number;
}

export default function CompanyCard({ id, name, url, description, industry, is_mine, scraped_at, featureCount }: CompanyCardProps) {
  return (
    <Link href={`/companies/${id}`}>
      <div className="bg-card border border-border rounded-lg p-5 hover:bg-card-hover hover:border-accent/30 transition-all cursor-pointer">
        <div className="flex items-start justify-between mb-3">
          <h3 className="font-semibold text-lg">{name}</h3>
          {is_mine && (
            <span className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded-full">Your Company</span>
          )}
        </div>
        {description && <p className="text-sm text-muted mb-3 line-clamp-2">{description}</p>}
        <div className="flex items-center gap-4 text-xs text-muted">
          {industry && <span className="bg-border px-2 py-0.5 rounded">{industry}</span>}
          {featureCount !== undefined && <span>{featureCount} features</span>}
          {scraped_at && <span>Scraped {new Date(scraped_at).toLocaleDateString()}</span>}
        </div>
        <div className="mt-2 text-xs text-muted truncate">{url}</div>
      </div>
    </Link>
  );
}
