import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/admin-db";
import { id } from "@instantdb/admin";
import { execSync } from "child_process";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    const result = execSync(
      `python3 -c "
import json, sys
sys.path.insert(0, '.')
from src.analysis.comparison import run_comparison
data = run_comparison()
print(json.dumps(data))
"`,
      { cwd: process.cwd(), timeout: 180000, encoding: "utf-8" }
    );

    const comparison = JSON.parse(result.trim());
    const db = getAdminDb();
    const cid = id();

    await db.transact(
      db.tx.comparisons[cid].update({
        type: body.type || "full",
        data: JSON.stringify(comparison),
        created_at: new Date().toISOString(),
      })
    );

    return NextResponse.json({ success: true, comparisonId: cid, comparison });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
