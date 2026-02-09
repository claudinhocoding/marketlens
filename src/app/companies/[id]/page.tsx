"use client";

import { db } from "@/lib/db";
import { useParams } from "next/navigation";
import { useState } from "react";
import FeatureMatrix from "@/components/FeatureMatrix";
import SocialFollowers from "@/components/SocialFollowers";
import WebsiteAssessment from "@/components/WebsiteAssessment";

type Tab = "overview" | "product" | "marketing";

export default function CompanyDetail() {
  const { id } = useParams<{ id: string }>();
  const [tab, setTab] = useState<Tab>("overview");
  const { isLoading, error, data } = db.useQuery({
    companies: {
      $: { where: { id } },
      features: {},
      pricing_tiers: {},
      marketing_intel: {},
      product_intel: {},
      blog_posts: {},
      events: {},
      social_profiles: {},
      contacts: {},
      job_listings: {},
    },
  });

  if (isLoading) return <div className="text-muted py-20 text-center">Loading…</div>;
  if (error) return <div className="text-danger py-20 text-center">Error: {error.message}</div>;

  const company = data.companies?.[0];
  if (!company) return <div className="text-muted py-20 text-center">Company not found.</div>;

  const marketing = company.marketing_intel?.[0];
  const product = company.product_intel?.[0];

  const parseJson = (s?: string) => {
    if (!s) return [];
    try { return JSON.parse(s); } catch { return []; }
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "product", label: "Product" },
    { key: "marketing", label: "Marketing" },
  ];

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-2xl font-bold">{company.name}</h1>
          {company.is_mine && <span className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded-full">Your Company</span>}
        </div>
        <p className="text-muted text-sm">{company.url}</p>
        {company.description && <p className="text-sm mt-2">{company.description}</p>}
        {company.industry && <span className="inline-block mt-2 text-xs bg-border px-2 py-0.5 rounded">{company.industry}</span>}
      </div>

      {/* Tab bar */}
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

      {tab === "overview" && (
        <>
          <Section title="Social Profiles">
            <SocialFollowers profiles={company.social_profiles || []} />
          </Section>

          <Section title="Contacts">
            {company.contacts && company.contacts.length > 0 ? (
              <div className="bg-card border border-border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-muted font-medium">Name</th>
                      <th className="text-left py-3 px-4 text-muted font-medium">Title</th>
                      <th className="text-left py-3 px-4 text-muted font-medium">Email</th>
                      <th className="text-left py-3 px-4 text-muted font-medium">Phone</th>
                    </tr>
                  </thead>
                  <tbody>
                    {company.contacts.map((c) => (
                      <tr key={c.id} className="border-b border-border/50 hover:bg-card-hover">
                        <td className="py-2 px-4">{c.name}</td>
                        <td className="py-2 px-4 text-muted">{c.title || "—"}</td>
                        <td className="py-2 px-4 text-muted">{c.email ? <a href={`mailto:${c.email}`} className="text-accent hover:underline">{c.email}</a> : "—"}</td>
                        <td className="py-2 px-4 text-muted">{c.phone || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <Empty />}
          </Section>

          <Section title="Blog Posts">
            {company.blog_posts && company.blog_posts.length > 0 ? (
              <div className="space-y-2">
                {company.blog_posts.map((p) => (
                  <div key={p.id} className="bg-card border border-border rounded-lg p-4 flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-sm">{p.title}</h4>
                      {p.summary && <p className="text-xs text-muted mt-1">{p.summary}</p>}
                    </div>
                    <span className="text-xs text-muted">{p.date}</span>
                  </div>
                ))}
              </div>
            ) : <Empty />}
          </Section>

          <Section title="Open Jobs">
            {company.job_listings && company.job_listings.length > 0 ? (
              <div className="space-y-2">
                {company.job_listings.map((j) => (
                  <div key={j.id} className="bg-card border border-border rounded-lg p-4 flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-sm">{j.title}</h4>
                      <div className="text-xs text-muted mt-1">{[j.department, j.location].filter(Boolean).join(" · ")}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      {j.posted_date && <span className="text-xs text-muted">{j.posted_date}</span>}
                      {j.url && <a href={j.url} target="_blank" rel="noopener noreferrer" className="text-accent text-xs hover:underline">View ↗</a>}
                    </div>
                  </div>
                ))}
              </div>
            ) : <Empty />}
          </Section>

          <Section title="Events">
            {company.events && company.events.length > 0 ? (
              <div className="space-y-2">
                {company.events.map((e) => (
                  <div key={e.id} className="bg-card border border-border rounded-lg p-4">
                    <h4 className="font-medium text-sm">{e.name}</h4>
                    <div className="text-xs text-muted mt-1">{[e.date, e.location].filter(Boolean).join(" · ")}</div>
                  </div>
                ))}
              </div>
            ) : <Empty />}
          </Section>
        </>
      )}

      {tab === "product" && (
        <>
          <Section title="Features">
            {company.features && company.features.length > 0 ? (
              <FeatureMatrix features={company.features.map(f => ({ ...f, company: { id: company.id, name: company.name } }))} companies={[{ id: company.id, name: company.name }]} />
            ) : <Empty />}
          </Section>

          <Section title="Pricing Tiers">
            {company.pricing_tiers && company.pricing_tiers.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {company.pricing_tiers.map((t) => (
                  <div key={t.id} className="bg-card border border-border rounded-lg p-5">
                    <h4 className="font-semibold mb-1">{t.name}</h4>
                    <div className="text-2xl font-bold text-accent mb-1">{t.price || "N/A"}</div>
                    {t.billing_period && <div className="text-xs text-muted mb-3">{t.billing_period}</div>}
                    {t.features_text && <p className="text-sm text-muted whitespace-pre-wrap">{t.features_text}</p>}
                  </div>
                ))}
              </div>
            ) : <Empty />}
          </Section>

          <Section title="Product Intelligence">
            {product ? (
              <div className="bg-card border border-border rounded-lg p-5 space-y-3">
                {product.feature_summary && <div><span className="text-xs text-muted uppercase">Feature Summary</span><p className="text-sm mt-1">{product.feature_summary}</p></div>}
                {product.tech_stack && <div><span className="text-xs text-muted uppercase">Tech Stack</span><p className="text-sm mt-1">{product.tech_stack}</p></div>}
                {product.positioning && <div><span className="text-xs text-muted uppercase">Positioning</span><p className="text-sm mt-1">{product.positioning}</p></div>}
              </div>
            ) : <Empty />}
          </Section>
        </>
      )}

      {tab === "product" && (
        <div className="mt-6">
          <WebsiteAssessment companyId={company.id} companyName={company.name} hasData={!!company.features?.length || !!product} />
        </div>
      )}

      {tab === "marketing" && (
        <>
          <Section title="Marketing Intelligence">
            {marketing ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <IntelCard title="Value Props" items={parseJson(marketing.value_props)} />
                <IntelCard title="Target Personas" items={parseJson(marketing.target_personas)} />
                <IntelCard title="Key Messages" items={parseJson(marketing.key_messages)} />
                <IntelCard title="Differentiators" items={parseJson(marketing.differentiators)} />
                <IntelCard title="Pain Points" items={parseJson(marketing.pain_points)} />
              </div>
            ) : <Empty />}
          </Section>
        </>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="text-lg font-semibold mb-4">{title}</h2>
      {children}
    </div>
  );
}

function Empty() {
  return <p className="text-muted text-sm">No data extracted yet.</p>;
}

function IntelCard({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <h4 className="text-xs text-muted uppercase tracking-wider mb-2">{title}</h4>
      {items.length > 0 ? (
        <ul className="space-y-1">
          {items.map((item, i) => (
            <li key={i} className="text-sm flex items-start gap-2">
              <span className="text-accent mt-1">•</span>
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">—</p>
      )}
    </div>
  );
}
