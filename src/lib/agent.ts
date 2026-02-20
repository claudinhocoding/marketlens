import Anthropic from "@anthropic-ai/sdk";
import { askClaude } from "@/lib/llm";

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
    { role: "user", content: message },
  ];

  return askClaude({
    system: systemWithContext,
    messages,
    maxTokens: 4096,
  });
}
