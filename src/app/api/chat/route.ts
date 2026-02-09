import { NextRequest, NextResponse } from "next/server";
import { execSync } from "child_process";

export async function POST(req: NextRequest) {
  try {
    const { message, history } = await req.json();
    if (!message) return NextResponse.json({ error: "message required" }, { status: 400 });

    const escapedMessage = message.replace(/'/g, "\\'").replace(/"/g, '\\"');
    const result = execSync(
      `python3 -c "
import json, sys
sys.path.insert(0, '.')
from src.agent.agent import handle_query
response = handle_query('${escapedMessage}')
print(json.dumps({'response': response}))
"`,
      { cwd: process.cwd(), timeout: 120000, encoding: "utf-8" }
    );

    const data = JSON.parse(result.trim());
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
