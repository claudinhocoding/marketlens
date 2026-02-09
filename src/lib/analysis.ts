import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const model = process.env.ML_CLAUDE_MODEL || "claude-sonnet-4-5-20250929";

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

export async function scoreCompaniesOnAxes(companies: CompanyData[], xAxis: string, yAxis: string) {
  const summary = companies.map((c) => ({
    name: c.name,
    features: c.features?.map((f) => f.name) || [],
    positioning: c.product_intel?.positioning || "",
  }));
  const raw = await askClaude(
    "You are a competitive intelligence analyst. Return JSON only.",
    `Score each company on two axes: "${xAxis}" and "${yAxis}". Each score should be 0.0 to 1.0. Return a JSON array of objects with keys: name (string), x (number 0-1), y (number 0-1).\n\n${JSON.stringify(summary)}`
  );
  try {
    const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/) || raw.match(/(\[[\s\S]*\])/);
    return match ? JSON.parse(match[1]) : JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function generateTargetingMatrix(companies: CompanyData[]) {
  const summary = companies.map((c) => ({
    name: c.name,
    target_personas: c.marketing_intel?.target_personas || [],
    value_props: c.marketing_intel?.value_props || [],
    positioning: c.product_intel?.positioning || "",
  }));
  const raw = await askClaude(
    "You are a competitive intelligence analyst. Return JSON only.",
    `Analyze which industry verticals each company targets. Return JSON with keys: verticals (string[]), ratings (object mapping vertical name to object mapping company name to "HIGH"|"MEDIUM"|"LOW"|"NONE").\n\n${JSON.stringify(summary)}`
  );
  try {
    const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/) || raw.match(/(\{[\s\S]*\})/);
    return match ? JSON.parse(match[1]) : JSON.parse(raw);
  } catch {
    return { verticals: [], ratings: {} };
  }
}

export async function analyzePainPoints(companies: CompanyData[]) {
  const summary = companies.map((c) => ({
    name: c.name,
    value_props: c.marketing_intel?.value_props || [],
    differentiators: c.marketing_intel?.differentiators || [],
  }));
  const raw = await askClaude(
    "You are a competitive intelligence analyst. Return JSON only.",
    `Identify pain points addressed across these companies. Categorize each as: Automation, Cost, Quality, Time, Risk, or Other. Return JSON with keys: pain_points (array of objects with: text (string), category (string), addressed_by (string[] of company names)).\n\n${JSON.stringify(summary)}`
  );
  try {
    const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/) || raw.match(/(\{[\s\S]*\})/);
    return match ? JSON.parse(match[1]) : JSON.parse(raw);
  } catch {
    return { pain_points: [] };
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
