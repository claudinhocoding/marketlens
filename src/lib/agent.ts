import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const model = process.env.ML_CLAUDE_MODEL || "claude-sonnet-4-20250514";

const SYSTEM_PROMPT = `You are a competitive intelligence analyst assistant for MarketLens. You help users understand competitive landscapes, analyze companies, compare features, and develop strategy.

You have access to the user's competitive intelligence data. Answer questions based on the provided context. Be specific, data-driven, and actionable.

If the context doesn't contain enough information to answer, say so and suggest what data the user should gather.`;

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function handleQuery(
  message: string,
  context?: string,
  history?: ChatMessage[]
): Promise<string> {
  const systemWithContext = context
    ? `${SYSTEM_PROMPT}\n\nCurrent data context:\n${context}`
    : SYSTEM_PROMPT;

  const messages: Anthropic.MessageParam[] = [
    ...(history || []).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user" as const, content: message },
  ];

  const res = await client.messages.create({
    model,
    max_tokens: 4096,
    system: systemWithContext,
    messages,
  });

  const block = res.content[0];
  return block.type === "text" ? block.text : "";
}
