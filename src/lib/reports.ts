import type { CompanyData } from "@/lib/analysis";
import { askClaude, parseWithSchema, z } from "@/lib/llm";

const assessmentSchema = z.object({
  summary: z.string(),
  opportunities: z.array(
    z.object({
      title: z.string(),
      rationale: z.string(),
      execution_requirements: z.string(),
      risk: z.enum(["Low", "Medium", "High"]),
      estimated_impact: z.string(),
    })
  ),
});

export async function generateCompetitiveReport(companies: CompanyData[]) {
  const content = await askClaude({
    system: "You are a competitive intelligence analyst writing a detailed report in markdown.",
    prompt:
      "Write a comprehensive competitive analysis report for the following companies. Include sections: Executive Summary, Company Overviews, Feature Comparison, Pricing Analysis, Marketing & Positioning, Strengths & Weaknesses, Recommendations.\n\nCompanies:\n" +
      JSON.stringify(companies, null, 2),
    maxTokens: 8192,
  });

  return {
    title: "Competitive Analysis Report",
    content,
  };
}

export async function generateAssessment(company: CompanyData) {
  const raw = await askClaude({
    system: "You are a competitive intelligence analyst. Return JSON only.",
    prompt:
      `Generate a website assessment for "${company.name}". Return JSON with keys: summary (string), opportunities (array of objects with: title (string), rationale (string), execution_requirements (string), risk (Low|Medium|High), estimated_impact (string)).\n\nCompany data:\n${JSON.stringify(company, null, 2)}`,
    maxTokens: 8192,
  });

  const parsed = parseWithSchema(raw, assessmentSchema, {
    summary: "",
    opportunities: [],
  });

  return {
    title: `Website Assessment: ${company.name}`,
    content: JSON.stringify(parsed),
  };
}

export async function generateMarketOverview(companies: CompanyData[]) {
  const content = await askClaude({
    system: "You are a market analyst writing a market overview report in markdown.",
    prompt:
      "Write a market overview report based on these companies in the space. Include sections: Market Landscape, Key Trends, Competitive Dynamics, Market Gaps, Future Outlook.\n\nCompanies:\n" +
      JSON.stringify(companies, null, 2),
    maxTokens: 8192,
  });

  return {
    title: "Market Overview Report",
    content,
  };
}
