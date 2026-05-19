import Anthropic from "@anthropic-ai/sdk";
import { getAIClient, INTERVIEW_MODEL } from "@/lib/ai";
import { INTERVIEW_SYSTEM_PROMPT, buildInterviewContext } from "@/lib/prompts";

type ConversationMessage = {
  role: "user" | "assistant";
  content: string;
};

type InterviewContext = {
  layer: number;
  readinessScore: number;
  filledAreas: string[];
  missingAreas: string[];
  workingContextMarkdown: string;
  isCheckpoint: boolean;
  checkpointLayer?: number;
};

// Streams the next interviewer question. Yields text chunks.
// Returns the full accumulated text when done.
export async function* streamInterviewResponse(
  messages: ConversationMessage[],
  ctx: InterviewContext
): AsyncGenerator<string, string, unknown> {
  const client = getAIClient();
  const dynamicContext = buildInterviewContext(ctx);

  const stream = client.messages.stream({
    model: INTERVIEW_MODEL,
    max_tokens: 600,
    system: [
      {
        type: "text",
        text: INTERVIEW_SYSTEM_PROMPT,
        // Cache the static personality prompt — saves ~90% input tokens per call
        cache_control: { type: "ephemeral" },
      } as Anthropic.TextBlockParam & { cache_control: { type: "ephemeral" } },
      {
        type: "text",
        text: dynamicContext,
      },
    ],
    messages: messages.slice(-20), // keep last 20 turns to stay within context limits
  });

  let full = "";

  for await (const event of stream) {
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      full += event.delta.text;
      yield event.delta.text;
    }
  }

  return full;
}

// Generates a non-streaming final closing message when exit signal detected.
export async function generateExitSummary(
  messages: ConversationMessage[],
  ctx: InterviewContext
): Promise<string> {
  const client = getAIClient();
  const dynamicContext = buildInterviewContext({ ...ctx, isCheckpoint: false });

  const exitInstruction = `\n\nThe client has just indicated they want to stop the interview now. Write a warm closing response:
1. Acknowledge their choice to stop (1 sentence).
2. Give a 3-bullet summary of the key things that were captured.
3. Tell them their brief is being generated and they will receive a link shortly.
Do NOT ask any more questions.`;

  const response = await client.messages.create({
    model: INTERVIEW_MODEL,
    max_tokens: 400,
    system: [
      {
        type: "text",
        text: INTERVIEW_SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      } as Anthropic.TextBlockParam & { cache_control: { type: "ephemeral" } },
      {
        type: "text",
        text: dynamicContext + exitInstruction,
      },
    ],
    messages: messages.slice(-20),
  });

  const block = response.content[0];
  return block.type === "text" ? block.text : "";
}
