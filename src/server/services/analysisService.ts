import Anthropic from "@anthropic-ai/sdk";
import { getAIClient, ANALYSIS_MODEL } from "@/lib/ai";
import { ANALYSIS_SYSTEM_PROMPT } from "@/lib/prompts";

export type AnalysisResult = {
  projectPatch: Partial<{
    initialRequest: string;
    businessDescription: string;
    desiredChange: string;
  }>;
  factsPatch: Partial<{
    goals: string[];
    audience: string[];
    deliverables: string[];
    inScope: string[];
    outOfScope: string[];
    acceptanceCriteria: string[];
    risks: string[];
    timeline: string;
    budget: string;
  }>;
  tastePatch: Partial<{
    clientPhrases: string[];
    vagueTerms: string[];
    references: string[];
    avoid: string[];
  }>;
  clarityUpdates: Partial<Record<string, number>>;
  readinessScore: number;
  readinessLevel: string;
  currentLayer: number;
  layerComplete: boolean;
  fatigueSignal: boolean;
  extractedVagueTerms: string[];
  detectedContradictions: string[];
};

const FALLBACK: AnalysisResult = {
  projectPatch: {},
  factsPatch: {},
  tastePatch: {},
  clarityUpdates: {},
  readinessScore: 10,
  readinessLevel: "raw_request",
  currentLayer: 1,
  layerComplete: false,
  fatigueSignal: false,
  extractedVagueTerms: [],
  detectedContradictions: [],
};

export async function analyzeAnswer(
  userAnswer: string,
  currentStage: string,
  workingContextMarkdown: string,
  stateJson: Record<string, unknown>
): Promise<AnalysisResult> {
  const client = getAIClient();

  const userContent = `Current interview stage: ${currentStage}

Client's answer:
"${userAnswer}"

Current working context:
${workingContextMarkdown || "No context yet."}

Current state summary:
${JSON.stringify(stateJson?.readiness ?? {}, null, 2)}`;

  let response: Awaited<ReturnType<typeof client.messages.create>>;
  try {
    response = await client.messages.create({
      model: ANALYSIS_MODEL,
      max_tokens: 800,
      system: [
        {
          type: "text",
          text: ANALYSIS_SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        } as Anthropic.TextBlockParam & { cache_control: { type: "ephemeral" } },
      ],
      messages: [{ role: "user", content: userContent }],
    });
  } catch {
    return FALLBACK;
  }

  const block = response.content[0];
  if (block.type !== "text") return FALLBACK;

  try {
    const raw = block.text.trim();
    // Strip any accidental markdown fences
    const clean = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    const parsed = JSON.parse(clean) as Partial<AnalysisResult>;

    return {
      projectPatch: parsed.projectPatch ?? {},
      factsPatch: parsed.factsPatch ?? {},
      tastePatch: parsed.tastePatch ?? {},
      clarityUpdates: parsed.clarityUpdates ?? {},
      readinessScore: parsed.readinessScore ?? FALLBACK.readinessScore,
      readinessLevel: parsed.readinessLevel ?? FALLBACK.readinessLevel,
      currentLayer: parsed.currentLayer ?? 1,
      layerComplete: parsed.layerComplete ?? false,
      fatigueSignal: parsed.fatigueSignal ?? false,
      extractedVagueTerms: parsed.extractedVagueTerms ?? [],
      detectedContradictions: parsed.detectedContradictions ?? [],
    };
  } catch {
    return FALLBACK;
  }
}
