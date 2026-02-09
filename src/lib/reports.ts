import Anthropic from "@anthropic-ai/sdk";
import type { CompanyData } from "./analysis";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const model = process.env.ML_CLAUDE_MODEL || "claude-sonnet-4-5-20250514";

async function askClaude(system: string, prompt: string): Promise<string> {
  const res = await client.messages.create({
    model,
    max_tokens: 8192,
    system,
    messages: [{ role: "user", content: prompt }],
  });
  const block = res.content[0];
  return block.type === "text" ? block.text : "";
}

export async function generateCompetitiveReport(companies: CompanyData[]) {
  const content = await askClaude(
    "You are a competitive intelligence analyst writing a detailed report in markdown.",
    `Write a comprehensive competitive analysis report for the following companies. Include sections: Executive Summary, Company Overviews, Feature Comparison, Pricing Analysis, Marketing & Positioning, Strengths & Weaknesses, Recommendations.\n\nCompanies:\n${JSON.stringify(companies, null, 2)}`
  );
  return {
    title: "Competitive Analysis Report",
    content,
  };
}

export async function generateMarketOverview(companies: CompanyData[]) {
  const content = await askClaude(
    "You are a market analyst writing a market overview report in markdown.",
    `Write a market overview report based on these companies in the space. Include sections: Market Landscape, Key Trends, Competitive Dynamics, Market Gaps, Future Outlook.\n\nCompanies:\n${JSON.stringify(companies, null, 2)}`
  );
  return {
    title: "Market Overview Report",
    content,
  };
}
