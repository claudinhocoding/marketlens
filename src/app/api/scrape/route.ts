import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/admin-db";
import { id } from "@instantdb/admin";
import { execSync } from "child_process";

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url) return NextResponse.json({ error: "URL required" }, { status: 400 });

    // Run Python scraper
    const result = execSync(
      `python3 -c "
import json, sys
sys.path.insert(0, '.')
from src.scraper.crawler import scrape_website
data = scrape_website('${url.replace(/'/g, "\\'")}')
print(json.dumps(data))
"`,
      { cwd: process.cwd(), timeout: 120000, encoding: "utf-8" }
    );

    const scraped = JSON.parse(result.trim());
    const db = getAdminDb();
    const companyId = id();

    await db.transact(
      db.tx.companies[companyId].update({
        name: scraped.name || new URL(url).hostname,
        url,
        description: scraped.description || "",
        industry: scraped.industry || "",
        is_mine: false,
        scraped_at: new Date().toISOString(),
      })
    );

    return NextResponse.json({ success: true, companyId, scraped });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
