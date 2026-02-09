import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/admin-db";
import { id } from "@instantdb/admin";
import { execSync } from "child_process";

export async function POST(req: NextRequest) {
  try {
    const { type } = await req.json();

    const result = execSync(
      `python3 -c "
import json, sys
sys.path.insert(0, '.')
from src.reports import generate_report
data = generate_report('${(type || "competitive_assessment").replace(/'/g, "\\'")}')
print(json.dumps(data))
"`,
      { cwd: process.cwd(), timeout: 180000, encoding: "utf-8" }
    );

    const report = JSON.parse(result.trim());
    const db = getAdminDb();
    const rid = id();

    await db.transact(
      db.tx.reports[rid].update({
        title: report.title || `${type} Report`,
        type: type || "competitive_assessment",
        content: report.content || "",
        created_at: new Date().toISOString(),
      })
    );

    return NextResponse.json({ success: true, reportId: rid, report });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
