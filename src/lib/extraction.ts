import { askClaude, parseWithSchema, z } from "@/lib/llm";

const productIntelSchema = z.object({
  feature_summary: z.string().optional(),
  tech_stack: z.string().optional(),
  positioning: z.string().optional(),
});

const marketingIntelSchema = z.object({
  value_props: z.array(z.string()).optional(),
  target_personas: z.array(z.string()).optional(),
  key_messages: z.array(z.string()).optional(),
  differentiators: z.array(z.string()).optional(),
  pain_points: z.array(z.string()).optional(),
});

const featureSchema = z.object({
  name: z.string(),
  category: z.string().optional(),
  description: z.string().optional(),
});

const pricingTierSchema = z.object({
  name: z.string(),
  price: z.string().optional(),
  billing_period: z.string().optional(),
  features_text: z.string().optional(),
});

const contactSchema = z.object({
  name: z.string(),
  title: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
});

const jobListingSchema = z.object({
  title: z.string(),
  location: z.string().optional(),
  department: z.string().optional(),
  url: z.string().optional(),
  posted_date: z.string().optional(),
});

export interface ProductIntel {
  feature_summary: string;
  tech_stack: string;
  positioning: string;
}

export interface MarketingIntel {
  value_props: string[];
  target_personas: string[];
  key_messages: string[];
  differentiators: string[];
  pain_points: string[];
}

export interface Feature {
  name: string;
  category: string;
  description: string;
}

export interface PricingTier {
  name: string;
  price: string;
  billing_period: string;
  features_text: string;
}

export interface Contact {
  name: string;
  title: string;
  email: string;
  phone: string;
}

export interface JobListing {
  title: string;
  location: string;
  department: string;
  url: string;
  posted_date: string;
}

export async function extractProductIntel(html: string): Promise<ProductIntel> {
  const text = html.slice(0, 30000);
  const raw = await askClaude({
    system: "You extract product intelligence from website content. Return JSON only.",
    prompt:
      "Analyze this website content and extract product intelligence. Return JSON with keys: feature_summary (string), tech_stack (string), positioning (string).\n\nContent:\n" +
      text,
  });

  const parsed = parseWithSchema(raw, productIntelSchema, {
    feature_summary: "",
    tech_stack: "",
    positioning: "",
  });

  return {
    feature_summary: parsed.feature_summary || "",
    tech_stack: parsed.tech_stack || "",
    positioning: parsed.positioning || "",
  };
}

export async function extractMarketingIntel(html: string): Promise<MarketingIntel> {
  const text = html.slice(0, 30000);
  const raw = await askClaude({
    system: "You extract marketing intelligence from website content. Return JSON only.",
    prompt:
      "Analyze this website content and extract marketing intelligence. Return JSON with keys: value_props (string[]), target_personas (string[]), key_messages (string[]), differentiators (string[]), pain_points (string[]).\n\nContent:\n" +
      text,
  });

  const parsed = parseWithSchema(raw, marketingIntelSchema, {
    value_props: [],
    target_personas: [],
    key_messages: [],
    differentiators: [],
    pain_points: [],
  });

  return {
    value_props: parsed.value_props || [],
    target_personas: parsed.target_personas || [],
    key_messages: parsed.key_messages || [],
    differentiators: parsed.differentiators || [],
    pain_points: parsed.pain_points || [],
  };
}

export async function extractFeatures(html: string): Promise<Feature[]> {
  const text = html.slice(0, 30000);
  const raw = await askClaude({
    system: "You extract product features from website content. Return JSON only.",
    prompt:
      "Extract all product features from this website content. Return a JSON array of objects with keys: name (string), category (string), description (string).\n\nContent:\n" +
      text,
  });

  const parsed = parseWithSchema(raw, z.array(featureSchema), []);
  return parsed
    .filter((item) => item.name.trim().length > 0)
    .map((item) => ({
      name: item.name,
      category: item.category || "",
      description: item.description || "",
    }));
}

export async function extractPricing(html: string): Promise<PricingTier[]> {
  const text = html.slice(0, 30000);
  const raw = await askClaude({
    system: "You extract pricing information from website content. Return JSON only.",
    prompt:
      "Extract pricing tiers from this website content. Return a JSON array of objects with keys: name (string), price (string), billing_period (string), features_text (string, comma-separated features).\n\nContent:\n" +
      text,
  });

  const parsed = parseWithSchema(raw, z.array(pricingTierSchema), []);
  return parsed
    .filter((item) => item.name.trim().length > 0)
    .map((item) => ({
      name: item.name,
      price: item.price || "",
      billing_period: item.billing_period || "",
      features_text: item.features_text || "",
    }));
}

export async function extractContacts(html: string): Promise<Contact[]> {
  const text = html.slice(0, 30000);
  const raw = await askClaude({
    system: "You extract contact information from website content. Return JSON only.",
    prompt:
      "Extract any contact information (team members, leadership, support contacts) from this website content. Return a JSON array of objects with keys: name (string), title (string), email (string), phone (string). Only include entries where at least a name is found.\n\nContent:\n" +
      text,
  });

  const parsed = parseWithSchema(raw, z.array(contactSchema), []);
  return parsed
    .filter((item) => item.name.trim().length > 0)
    .map((item) => ({
      name: item.name,
      title: item.title || "",
      email: item.email || "",
      phone: item.phone || "",
    }));
}

export async function extractJobListings(html: string): Promise<JobListing[]> {
  const text = html.slice(0, 30000);
  const raw = await askClaude({
    system: "You extract job listings from website content. Return JSON only.",
    prompt:
      "Extract any job listings/open positions from this website content. Return a JSON array of objects with keys: title (string), location (string), department (string), url (string), posted_date (string). Only include actual job listings.\n\nContent:\n" +
      text,
  });

  const parsed = parseWithSchema(raw, z.array(jobListingSchema), []);
  return parsed
    .filter((item) => item.title.trim().length > 0)
    .map((item) => ({
      title: item.title,
      location: item.location || "",
      department: item.department || "",
      url: item.url || "",
      posted_date: item.posted_date || "",
    }));
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
