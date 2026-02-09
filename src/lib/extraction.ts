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

function parseJSON(text: string): Record<string, unknown> {
  // Try to extract JSON from markdown code blocks or raw
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*\})/);
  if (match) {
    try { return JSON.parse(match[1]); } catch {}
  }
  try { return JSON.parse(text); } catch {}
  return {};
}

export interface ProductIntel {
  feature_summary: string;
  tech_stack: string;
  positioning: string;
}

export async function extractProductIntel(html: string): Promise<ProductIntel> {
  const text = html.slice(0, 30000);
  const raw = await askClaude(
    "You extract product intelligence from website content. Return JSON only.",
    `Analyze this website content and extract product intelligence. Return JSON with keys: feature_summary (string), tech_stack (string), positioning (string).\n\nContent:\n${text}`
  );
  const data = parseJSON(raw);
  return {
    feature_summary: (data.feature_summary as string) || "",
    tech_stack: (data.tech_stack as string) || "",
    positioning: (data.positioning as string) || "",
  };
}

export interface MarketingIntel {
  value_props: string[];
  target_personas: string[];
  key_messages: string[];
  differentiators: string[];
  pain_points: string[];
}

export async function extractMarketingIntel(html: string): Promise<MarketingIntel> {
  const text = html.slice(0, 30000);
  const raw = await askClaude(
    "You extract marketing intelligence from website content. Return JSON only.",
    `Analyze this website content and extract marketing intelligence. Return JSON with keys: value_props (string[]), target_personas (string[]), key_messages (string[]), differentiators (string[]), pain_points (string[]).\n\nContent:\n${text}`
  );
  const data = parseJSON(raw);
  const arr = (v: unknown) => (Array.isArray(v) ? v : []);
  return {
    value_props: arr(data.value_props),
    target_personas: arr(data.target_personas),
    key_messages: arr(data.key_messages),
    differentiators: arr(data.differentiators),
    pain_points: arr(data.pain_points),
  };
}

export interface Feature {
  name: string;
  category: string;
  description: string;
}

export async function extractFeatures(html: string): Promise<Feature[]> {
  const text = html.slice(0, 30000);
  const raw = await askClaude(
    "You extract product features from website content. Return JSON only.",
    `Extract all product features from this website content. Return a JSON array of objects with keys: name (string), category (string), description (string).\n\nContent:\n${text}`
  );
  const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/) || raw.match(/(\[[\s\S]*\])/);
  if (match) {
    try {
      const arr = JSON.parse(match[1]);
      if (Array.isArray(arr)) return arr;
    } catch {}
  }
  try {
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) return arr;
  } catch {}
  return [];
}

export interface PricingTier {
  name: string;
  price: string;
  billing_period: string;
  features_text: string;
}

export async function extractPricing(html: string): Promise<PricingTier[]> {
  const text = html.slice(0, 30000);
  const raw = await askClaude(
    "You extract pricing information from website content. Return JSON only.",
    `Extract pricing tiers from this website content. Return a JSON array of objects with keys: name (string), price (string), billing_period (string), features_text (string, comma-separated features).\n\nContent:\n${text}`
  );
  const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/) || raw.match(/(\[[\s\S]*\])/);
  if (match) {
    try {
      const arr = JSON.parse(match[1]);
      if (Array.isArray(arr)) return arr;
    } catch {}
  }
  try {
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) return arr;
  } catch {}
  return [];
}

export interface Contact {
  name: string;
  title: string;
  email: string;
  phone: string;
}

export async function extractContacts(html: string): Promise<Contact[]> {
  const text = html.slice(0, 30000);
  const raw = await askClaude(
    "You extract contact information from website content. Return JSON only.",
    `Extract any contact information (team members, leadership, support contacts) from this website content. Return a JSON array of objects with keys: name (string), title (string), email (string), phone (string). Only include entries where at least a name is found.\n\nContent:\n${text}`
  );
  const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/) || raw.match(/(\[[\s\S]*\])/);
  if (match) {
    try {
      const arr = JSON.parse(match[1]);
      if (Array.isArray(arr)) return arr;
    } catch {}
  }
  try {
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) return arr;
  } catch {}
  return [];
}

export interface JobListing {
  title: string;
  location: string;
  department: string;
  url: string;
  posted_date: string;
}

export async function extractJobListings(html: string): Promise<JobListing[]> {
  const text = html.slice(0, 30000);
  const raw = await askClaude(
    "You extract job listings from website content. Return JSON only.",
    `Extract any job listings/open positions from this website content. Return a JSON array of objects with keys: title (string), location (string), department (string), url (string), posted_date (string). Only include actual job listings.\n\nContent:\n${text}`
  );
  const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/) || raw.match(/(\[[\s\S]*\])/);
  if (match) {
    try {
      const arr = JSON.parse(match[1]);
      if (Array.isArray(arr)) return arr;
    } catch {}
  }
  try {
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) return arr;
  } catch {}
  return [];
}

export async function extractAll(text: string) {
  const allText = text.slice(0, 40000);
  const [product, marketing, features, pricing, contacts] = await Promise.all([
    extractProductIntel(allText),
    extractMarketingIntel(allText),
    extractFeatures(allText),
    extractPricing(allText),
    extractContacts(allText),
  ]);
  return { product, marketing, features, pricing_tiers: pricing, contacts };
}
