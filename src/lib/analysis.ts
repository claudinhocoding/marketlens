import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const model = process.env.ML_CLAUDE_MODEL || "claude-sonnet-4-20250514";

async function askClaude(system: string, prompt: string): Promise<string> {
  const res = await client.messages.create({
    model,
    max_tokens: 4096,
    system,
    messages: [{ role: "user", content: prompt }],
  });
  const block = res.content[0];
  return block.type === "text" ? block.text : "";
}

export interface CompanyData {
  name: string;
  features?: { name: string; category?: string; description?: string }[];
  marketing_intel?: { value_props?: string[]; target_personas?: string[]; differentiators?: string[] };
  product_intel?: { feature_summary?: string; positioning?: string };
  pricing_tiers?: { name: string; price?: string }[];
}

export async function generateFeatureMatrix(companies: CompanyData[]) {
  const summary = companies.map((c) => ({
    name: c.name,
    features: c.features?.map((f) => f.name) || [],
  }));
  const raw = await askClaude(
    "You are a competitive intelligence analyst. Return JSON only.",
    `Generate a feature comparison matrix for these companies. Return JSON with keys: categories (string[]), matrix (object where each key is a feature name and value is an object mapping company name to boolean).\n\n${JSON.stringify(summary)}`
  );
  try {
    const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/) || raw.match(/(\{[\s\S]*\})/);
    return match ? JSON.parse(match[1]) : JSON.parse(raw);
  } catch {
    return { categories: [], matrix: {} };
  }
}

export async function generateTargetingHeatmap(companies: CompanyData[]) {
  const summary = companies.map((c) => ({
    name: c.name,
    target_personas: c.marketing_intel?.target_personas || [],
    value_props: c.marketing_intel?.value_props || [],
  }));
  const raw = await askClaude(
    "You are a competitive intelligence analyst. Return JSON only.",
    `Generate a targeting heatmap showing how each company targets different personas. Return JSON with keys: personas (string[]), companies (object mapping company name to object mapping persona to intensity 0-10).\n\n${JSON.stringify(summary)}`
  );
  try {
    const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/) || raw.match(/(\{[\s\S]*\})/);
    return match ? JSON.parse(match[1]) : JSON.parse(raw);
  } catch {
    return { personas: [], companies: {} };
  }
}

export async function identifyGaps(companies: CompanyData[], myCompany: CompanyData) {
  const raw = await askClaude(
    "You are a competitive intelligence analyst. Return JSON only.",
    `Identify competitive gaps and opportunities for "${myCompany.name}" compared to these competitors. Return JSON with keys: gaps (string[]), opportunities (string[]), threats (string[]), recommendations (string[]).\n\nMy company: ${JSON.stringify(myCompany)}\n\nCompetitors: ${JSON.stringify(companies)}`
  );
  try {
    const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/) || raw.match(/(\{[\s\S]*\})/);
    return match ? JSON.parse(match[1]) : JSON.parse(raw);
  } catch {
    return { gaps: [], opportunities: [], threats: [], recommendations: [] };
  }
}
