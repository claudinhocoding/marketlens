import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const model = process.env.ML_CLAUDE_MODEL || "claude-sonnet-4-5-20250929";

interface AskClaudeParams {
  system: string;
  prompt?: string;
  messages?: Anthropic.MessageParam[];
  maxTokens?: number;
}

export async function askClaude({
  system,
  prompt,
  messages,
  maxTokens = 4096,
}: AskClaudeParams): Promise<string> {
  const res = await client.messages.create({
    model,
    max_tokens: maxTokens,
    system,
    messages:
      messages || (prompt ? ([{ role: "user", content: prompt }] as Anthropic.MessageParam[]) : []),
  });

  const block = res.content[0];
  return block.type === "text" ? block.text : "";
}

function parseJsonCandidate(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced?.[1]) {
    try {
      return JSON.parse(fenced[1]);
    } catch {
      // fall through
    }
  }

  const objectMatch = text.match(/(\{[\s\S]*\})/);
  if (objectMatch?.[1]) {
    try {
      return JSON.parse(objectMatch[1]);
    } catch {
      // fall through
    }
  }

  const arrayMatch = text.match(/(\[[\s\S]*\])/);
  if (arrayMatch?.[1]) {
    try {
      return JSON.parse(arrayMatch[1]);
    } catch {
      // fall through
    }
  }

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export function parseWithSchema<T>(
  text: string,
  schema: z.ZodType<T>,
  fallback: T
): T {
  const candidate = parseJsonCandidate(text);
  if (candidate == null) return fallback;

  const parsed = schema.safeParse(candidate);
  return parsed.success ? parsed.data : fallback;
}

export { z };
