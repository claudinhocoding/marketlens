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
  thumbnailUrl?: string;
}

export default function CompanyCard({ id, name, url, description, industry, is_mine, scraped_at, featureCount, thumbnailUrl }: CompanyCardProps) {
  return (
    <Link href={`/companies/${id}`}>
      <div className="bg-card border border-border rounded-lg overflow-hidden hover:bg-card-hover hover:border-accent/30 transition-all cursor-pointer">
        {thumbnailUrl && thumbnailUrl.length > 0 && (
          <div className="h-32 bg-border overflow-hidden">
            <img src={thumbnailUrl} alt={name} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          </div>
        )}
        <div className="p-5">
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
      </div>
    </Link>
  );
}
