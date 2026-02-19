import { askClaude, parseWithSchema, z } from "@/lib/llm";

export interface CompanyData {
  name: string;
  features?: { name: string; category?: string; description?: string }[];
  marketing_intel?: { value_props?: string[]; target_personas?: string[]; differentiators?: string[] };
  product_intel?: { feature_summary?: string; positioning?: string };
  pricing_tiers?: { name: string; price?: string }[];
}

const featureMatrixSchema = z.object({
  categories: z.array(z.string()),
  matrix: z.record(z.string(), z.record(z.string(), z.boolean())),
});

const targetingHeatmapSchema = z.object({
  personas: z.array(z.string()),
  companies: z.record(z.string(), z.record(z.string(), z.number())),
});

const positioningScoreSchema = z.array(
  z.object({
    name: z.string(),
    x: z.number(),
    y: z.number(),
  })
);

const targetingMatrixSchema = z.object({
  verticals: z.array(z.string()),
  ratings: z.record(
    z.string(),
    z.record(z.string(), z.enum(["HIGH", "MEDIUM", "LOW", "NONE"]))
  ),
});

const painPointsSchema = z.object({
  pain_points: z.array(
    z.object({
      text: z.string(),
      category: z.string(),
      addressed_by: z.array(z.string()),
    })
  ),
});

const gapsSchema = z.object({
  gaps: z.array(z.string()),
  opportunities: z.array(z.string()),
  threats: z.array(z.string()),
  recommendations: z.array(z.string()),
});

export async function generateFeatureMatrix(companies: CompanyData[]) {
  const summary = companies.map((c) => ({
    name: c.name,
    features: c.features?.map((f) => f.name) || [],
  }));

  const raw = await askClaude({
    system: "You are a competitive intelligence analyst. Return JSON only.",
    prompt:
      "Generate a feature comparison matrix for these companies. Return JSON with keys: categories (string[]), matrix (object where each key is a feature name and value is an object mapping company name to boolean).\n\n" +
      JSON.stringify(summary),
  });

  return parseWithSchema(raw, featureMatrixSchema, { categories: [], matrix: {} });
}

export async function generateTargetingHeatmap(companies: CompanyData[]) {
  const summary = companies.map((c) => ({
    name: c.name,
    target_personas: c.marketing_intel?.target_personas || [],
    value_props: c.marketing_intel?.value_props || [],
  }));

  const raw = await askClaude({
    system: "You are a competitive intelligence analyst. Return JSON only.",
    prompt:
      "Generate a targeting heatmap showing how each company targets different personas. Return JSON with keys: personas (string[]), companies (object mapping company name to object mapping persona to intensity 0-10).\n\n" +
      JSON.stringify(summary),
  });

  return parseWithSchema(raw, targetingHeatmapSchema, { personas: [], companies: {} });
}

export async function scoreCompaniesOnAxes(companies: CompanyData[], xAxis: string, yAxis: string) {
  const summary = companies.map((c) => ({
    name: c.name,
    features: c.features?.map((f) => f.name) || [],
    positioning: c.product_intel?.positioning || "",
  }));

  const raw = await askClaude({
    system: "You are a competitive intelligence analyst. Return JSON only.",
    prompt:
      `Score each company on two axes: "${xAxis}" and "${yAxis}". Each score should be 0.0 to 1.0. Return a JSON array of objects with keys: name (string), x (number 0-1), y (number 0-1).\n\n${JSON.stringify(summary)}`,
  });

  return parseWithSchema(raw, positioningScoreSchema, []);
}

export async function generateTargetingMatrix(companies: CompanyData[]) {
  const summary = companies.map((c) => ({
    name: c.name,
    target_personas: c.marketing_intel?.target_personas || [],
    value_props: c.marketing_intel?.value_props || [],
    positioning: c.product_intel?.positioning || "",
  }));

  const raw = await askClaude({
    system: "You are a competitive intelligence analyst. Return JSON only.",
    prompt:
      "Analyze which industry verticals each company targets. Return JSON with keys: verticals (string[]), ratings (object mapping vertical name to object mapping company name to \"HIGH\"|\"MEDIUM\"|\"LOW\"|\"NONE\").\n\n" +
      JSON.stringify(summary),
  });

  return parseWithSchema(raw, targetingMatrixSchema, { verticals: [], ratings: {} });
}

export async function analyzePainPoints(companies: CompanyData[]) {
  const summary = companies.map((c) => ({
    name: c.name,
    value_props: c.marketing_intel?.value_props || [],
    differentiators: c.marketing_intel?.differentiators || [],
  }));

  const raw = await askClaude({
    system: "You are a competitive intelligence analyst. Return JSON only.",
    prompt:
      "Identify pain points addressed across these companies. Categorize each as: Automation, Cost, Quality, Time, Risk, or Other. Return JSON with keys: pain_points (array of objects with: text (string), category (string), addressed_by (string[] of company names)).\n\n" +
      JSON.stringify(summary),
  });

  return parseWithSchema(raw, painPointsSchema, { pain_points: [] });
}

export async function identifyGaps(companies: CompanyData[], myCompany: CompanyData) {
  const raw = await askClaude({
    system: "You are a competitive intelligence analyst. Return JSON only.",
    prompt:
      `Identify competitive gaps and opportunities for "${myCompany.name}" compared to these competitors. Return JSON with keys: gaps (string[]), opportunities (string[]), threats (string[]), recommendations (string[]).\n\nMy company: ${JSON.stringify(myCompany)}\n\nCompetitors: ${JSON.stringify(companies)}`,
  });

  return parseWithSchema(raw, gapsSchema, {
    gaps: [],
    opportunities: [],
    threats: [],
    recommendations: [],
  });
}
