import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

export function getAIClient(): Anthropic {
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

export const INTERVIEW_MODEL =
  process.env.ANTHROPIC_INTERVIEW_MODEL ?? "claude-sonnet-4-6";

export const ANALYSIS_MODEL =
  process.env.ANTHROPIC_ANALYSIS_MODEL ?? "claude-haiku-4-5-20251001";
