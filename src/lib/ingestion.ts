import { id } from "@instantdb/admin";
import type {
  BlogPost,
  Contact,
  EventIntel,
  Feature,
  JobListing,
  MarketingIntel,
  PricingTier,
  ProductIntel,
} from "@/lib/extraction";
import type { ScrapedSite } from "@/lib/scraper";

interface ExistingLinkedItem {
  id: string;
}

export interface ExistingCompanyIntel {
  id: string;
  url: string;
  is_mine?: boolean;
  features?: ExistingLinkedItem[];
  pricing_tiers?: ExistingLinkedItem[];
  marketing_intel?: ExistingLinkedItem[];
  product_intel?: ExistingLinkedItem[];
  blog_posts?: ExistingLinkedItem[];
  events?: ExistingLinkedItem[];
  contacts?: ExistingLinkedItem[];
  job_listings?: ExistingLinkedItem[];
  social_profiles?: ExistingLinkedItem[];
}

export interface ExtractedIntelBundle {
  features: Feature[];
  pricing_tiers: PricingTier[];
  marketing?: MarketingIntel;
  product?: ProductIntel;
  contacts?: Contact[];
  blog_posts?: BlogPost[];
  events?: EventIntel[];
}

function uniqueBy<T>(items: T[], keyFn: (item: T) => string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    const key = keyFn(item).trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function hasMarketingData(marketing?: MarketingIntel) {
  if (!marketing) return false;
  return [
    ...(marketing.value_props || []),
    ...(marketing.target_personas || []),
    ...(marketing.key_messages || []),
    ...(marketing.differentiators || []),
    ...(marketing.pain_points || []),
  ].some((v) => String(v || "").trim().length > 0);
}

function hasProductData(product?: ProductIntel) {
  if (!product) return false;
  return [product.feature_summary, product.tech_stack, product.positioning].some(
    (v) => String(v || "").trim().length > 0
  );
}

function collectDeleteTxns(db: any, existing?: ExistingCompanyIntel): any[] {
  if (!existing) return [];
  return [
    ...(existing.features || []).map((f) => db.tx.features[f.id].delete()),
    ...(existing.pricing_tiers || []).map((p) => db.tx.pricing_tiers[p.id].delete()),
    ...(existing.marketing_intel || []).map((m) => db.tx.marketing_intel[m.id].delete()),
    ...(existing.product_intel || []).map((p) => db.tx.product_intel[p.id].delete()),
    ...(existing.blog_posts || []).map((b) => db.tx.blog_posts[b.id].delete()),
    ...(existing.events || []).map((e) => db.tx.events[e.id].delete()),
    ...(existing.contacts || []).map((c) => db.tx.contacts[c.id].delete()),
    ...(existing.job_listings || []).map((j) => db.tx.job_listings[j.id].delete()),
    ...(existing.social_profiles || []).map((s) => db.tx.social_profiles[s.id].delete()),
  ];
}

export function normalizeCompanyUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    parsed.hash = "";
    parsed.search = "";
    parsed.pathname = parsed.pathname.replace(/\/+$/, "") || "/";
    return parsed.toString();
  } catch {
    return rawUrl.trim();
  }
}

interface BuildTxnsInput {
  db: any;
  companyId: string;
  sourceUrl: string;
  scraped: ScrapedSite;
  extracted: ExtractedIntelBundle;
  jobs: JobListing[];
  existing?: ExistingCompanyIntel;
}

export function buildReplaceCompanyIntelTxns({
  db,
  companyId,
  sourceUrl,
  scraped,
  extracted,
  jobs,
  existing,
}: BuildTxnsInput): any[] {
  const txns: any[] = [];

  txns.push(
    db.tx.companies[companyId].update({
      name: scraped.name,
      url: sourceUrl,
      description: scraped.description,
      industry: scraped.industry,
      is_mine: existing ? Boolean(existing.is_mine) : false,
      scraped_at: new Date().toISOString(),
      thumbnail_url: scraped.thumbnailUrl || "",
    })
  );

  txns.push(...collectDeleteTxns(db, existing));

  const socialProfiles = uniqueBy(
    (scraped.socialProfiles || []).filter((sp) => sp.platform?.trim() && sp.url?.trim()),
    (sp) => `${sp.platform.toLowerCase()}::${sp.url.toLowerCase()}`
  );
  for (const sp of socialProfiles) {
    const sid = id();
    txns.push(
      db.tx.social_profiles[sid].update({
        platform: sp.platform,
        url: sp.url,
        followers_count: sp.followers_count || 0,
      })
    );
    txns.push(db.tx.companies[companyId].link({ social_profiles: sid }));
  }

  const features = uniqueBy(
    (extracted.features || []).filter((f) => f.name?.trim()),
    (f) => `${f.name.toLowerCase()}::${(f.category || "").toLowerCase()}`
  );
  for (const f of features) {
    const fid = id();
    txns.push(
      db.tx.features[fid].update({
        name: f.name,
        category: f.category || "",
        description: f.description || "",
      })
    );
    txns.push(db.tx.companies[companyId].link({ features: fid }));
  }

  const pricingTiers = uniqueBy(
    (extracted.pricing_tiers || []).filter((t) => t.name?.trim()),
    (t) => `${t.name.toLowerCase()}::${(t.price || "").toLowerCase()}::${(t.billing_period || "").toLowerCase()}`
  );
  for (const t of pricingTiers) {
    const tid = id();
    txns.push(
      db.tx.pricing_tiers[tid].update({
        name: t.name,
        price: t.price || "",
        billing_period: t.billing_period || "",
        features_text: t.features_text || "",
      })
    );
    txns.push(db.tx.companies[companyId].link({ pricing_tiers: tid }));
  }

  const contacts = uniqueBy(
    (extracted.contacts || []).filter((c) => c.name?.trim()),
    (c) => `${c.name.toLowerCase()}::${(c.email || "").toLowerCase()}::${(c.phone || "").toLowerCase()}`
  );
  for (const c of contacts) {
    const cid = id();
    txns.push(
      db.tx.contacts[cid].update({
        name: c.name,
        title: c.title || "",
        email: c.email || "",
        phone: c.phone || "",
        source_url: sourceUrl,
      })
    );
    txns.push(db.tx.companies[companyId].link({ contacts: cid }));
  }

  const blogPosts = uniqueBy(
    (extracted.blog_posts || []).filter((p) => p.title?.trim()),
    (p) => `${p.title.toLowerCase()}::${(p.url || "").toLowerCase()}`
  );
  for (const p of blogPosts) {
    const bid = id();
    txns.push(
      db.tx.blog_posts[bid].update({
        title: p.title,
        url: p.url || "",
        date: p.date || "",
        summary: p.summary || "",
      })
    );
    txns.push(db.tx.companies[companyId].link({ blog_posts: bid }));
  }

  const events = uniqueBy(
    (extracted.events || []).filter((e) => e.name?.trim()),
    (e) => `${e.name.toLowerCase()}::${(e.date || "").toLowerCase()}::${(e.location || "").toLowerCase()}`
  );
  for (const e of events) {
    const eid = id();
    txns.push(
      db.tx.events[eid].update({
        name: e.name,
        date: e.date || "",
        location: e.location || "",
        url: e.url || "",
      })
    );
    txns.push(db.tx.companies[companyId].link({ events: eid }));
  }

  if (hasMarketingData(extracted.marketing)) {
    const mid = id();
    txns.push(
      db.tx.marketing_intel[mid].update({
        value_props: JSON.stringify(extracted.marketing?.value_props || []),
        target_personas: JSON.stringify(extracted.marketing?.target_personas || []),
        key_messages: JSON.stringify(extracted.marketing?.key_messages || []),
        differentiators: JSON.stringify(extracted.marketing?.differentiators || []),
        pain_points: JSON.stringify(extracted.marketing?.pain_points || []),
      })
    );
    txns.push(db.tx.companies[companyId].link({ marketing_intel: mid }));
  }

  if (hasProductData(extracted.product)) {
    const pid = id();
    txns.push(
      db.tx.product_intel[pid].update({
        feature_summary: extracted.product?.feature_summary || "",
        tech_stack: extracted.product?.tech_stack || "",
        positioning: extracted.product?.positioning || "",
      })
    );
    txns.push(db.tx.companies[companyId].link({ product_intel: pid }));
  }

  const jobListings = uniqueBy(
    (jobs || []).filter((j) => j.title?.trim()),
    (j) => `${j.title.toLowerCase()}::${(j.location || "").toLowerCase()}::${(j.url || "").toLowerCase()}`
  );
  for (const j of jobListings) {
    const jid = id();
    txns.push(
      db.tx.job_listings[jid].update({
        title: j.title,
        location: j.location || "",
        department: j.department || "",
        url: j.url || "",
        posted_date: j.posted_date || "",
      })
    );
    txns.push(db.tx.companies[companyId].link({ job_listings: jid }));
  }

  return txns;
}
