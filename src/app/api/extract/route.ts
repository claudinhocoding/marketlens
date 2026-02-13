import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/admin-db";
import { id } from "@instantdb/admin";
import { extractAll } from "@/lib/extraction";
import { scrapeWebsite } from "@/lib/scraper";

export async function POST(req: NextRequest) {
  try {
    const { companyId, url } = await req.json();
    if (!companyId) return NextResponse.json({ error: "companyId required" }, { status: 400 });
    if (!url) return NextResponse.json({ error: "url required" }, { status: 400 });

    const scraped = await scrapeWebsite(url);
    const allText = [scraped.mainPage.text, ...scraped.subPages.map((p) => p.text)].join("\n\n");
    const extracted = await extractAll(allText);

    const db = getAdminDb();

    if (extracted.features) {
      for (const f of extracted.features) {
        const fid = id();
        await db.transact([
          db.tx.features[fid].update({ name: f.name, category: f.category || "", description: f.description || "" }),
          db.tx.companies[companyId].link({ features: fid }),
        ]);
      }
    }

    if (extracted.pricing_tiers) {
      for (const t of extracted.pricing_tiers) {
        const tid = id();
        await db.transact([
          db.tx.pricing_tiers[tid].update({ name: t.name, price: t.price || "", billing_period: t.billing_period || "", features_text: t.features_text || "" }),
          db.tx.companies[companyId].link({ pricing_tiers: tid }),
        ]);
      }
    }

    // Store social profiles from latest scrape
    for (const sp of scraped.socialProfiles || []) {
      const spId = id();
      await db.transact([
        db.tx.social_profiles[spId].update({ platform: sp.platform, url: sp.url, followers_count: sp.followers_count || 0 }),
        db.tx.companies[companyId].link({ social_profiles: spId }),
      ]);
    }

    // Store contacts
    for (const c of extracted.contacts || []) {
      const cid = id();
      await db.transact([
        db.tx.contacts[cid].update({ name: c.name, title: c.title || "", email: c.email || "", phone: c.phone || "", source_url: url }),
        db.tx.companies[companyId].link({ contacts: cid }),
      ]);
    }

    // Store blog posts
    for (const p of extracted.blog_posts || []) {
      const bid = id();
      await db.transact([
        db.tx.blog_posts[bid].update({
          title: p.title,
          url: p.url || "",
          date: p.date || "",
          summary: p.summary || "",
        }),
        db.tx.companies[companyId].link({ blog_posts: bid }),
      ]);
    }

    // Store events
    for (const e of extracted.events || []) {
      const eid = id();
      await db.transact([
        db.tx.events[eid].update({
          name: e.name,
          date: e.date || "",
          location: e.location || "",
          url: e.url || "",
        }),
        db.tx.companies[companyId].link({ events: eid }),
      ]);
    }

    if (extracted.marketing) {
      const mid = id();
      await db.transact([
        db.tx.marketing_intel[mid].update({
          value_props: JSON.stringify(extracted.marketing.value_props),
          target_personas: JSON.stringify(extracted.marketing.target_personas),
          key_messages: JSON.stringify(extracted.marketing.key_messages),
          differentiators: JSON.stringify(extracted.marketing.differentiators),
          pain_points: JSON.stringify(extracted.marketing.pain_points),
        }),
        db.tx.companies[companyId].link({ marketing_intel: mid }),
      ]);
    }

    if (extracted.product) {
      const pid = id();
      await db.transact([
        db.tx.product_intel[pid].update({
          feature_summary: extracted.product.feature_summary,
          tech_stack: extracted.product.tech_stack,
          positioning: extracted.product.positioning,
        }),
        db.tx.companies[companyId].link({ product_intel: pid }),
      ]);
    }

    // Store job listings from scraped job pages
    if (scraped.jobPages.length > 0) {
      const { extractJobListings } = await import("@/lib/extraction");
      const jobText = scraped.jobPages.map((p) => p.text).join("\n\n");
      const jobs = await extractJobListings(jobText);
      for (const j of jobs) {
        const jid = id();
        await db.transact([
          db.tx.job_listings[jid].update({ title: j.title, location: j.location || "", department: j.department || "", url: j.url || "", posted_date: j.posted_date || "" }),
          db.tx.companies[companyId].link({ job_listings: jid }),
        ]);
      }
    }

    return NextResponse.json({ success: true, extracted, scraped });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
