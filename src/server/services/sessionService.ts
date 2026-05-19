import { getSupabaseAdmin } from "@/lib/supabase/server";
import { streamInterviewResponse, generateExitSummary } from "./interviewService";
import { analyzeAnswer } from "./analysisService";
import { generateClientBrief } from "./documentService";

// ─── GitHub Actions sync trigger ──────────────────────────────────────────────

async function triggerGitHubSync() {
  const token = process.env.GITHUB_ACTIONS_TOKEN;
  if (!token) return; // optional — skip if not configured
  await fetch(
    "https://api.github.com/repos/bomberbelyk/brand-compass-/actions/workflows/sync-briefs.yml/dispatches",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({ ref: "main" }),
    }
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────

const EXIT_SIGNALS = ["готово"];

// Areas tracked per layer for context building
const LAYER_1_AREAS = ["initial_request", "business_context", "desired_change", "audience", "deliverables", "style"];
const LAYER_2_AREAS = ["scope", "acceptance_criteria", "risks", "timeline", "budget"];
const LAYER_3_AREAS = ["stakeholders", "technical_constraints", "edge_cases", "revision_process"];

// ─── Onboarding greeting (injected on first session start) ────────────────────

export function buildOnboardingMessage(name: string): string {
  return `${name}, розкажіть мені про ваш бренд — просто, своїми словами. Що це за проєкт і чому він для вас важливий?

Я буду ставити запитання, щоб разом розібратись у характері бренду і підготувати бриф для дизайнера. Коли відчуєте, що сказали достатньо — просто напишіть «готово», і я сформую бриф з того, що ми з'ясували.`;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function setClientName(sessionId: string, name: string) {
  const trimmedName = name.trim();
  if (trimmedName.length < 2) throw new Error("INVALID_NAME");

  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();

  await supabase.from("interview_messages").insert({
    session_id: sessionId,
    role: "user",
    content: trimmedName,
    metadata_json: { kind: "client_name" },
  });

  const assistantContent = buildOnboardingMessage(trimmedName);

  await supabase.from("interview_messages").insert({
    session_id: sessionId,
    role: "assistant",
    content: assistantContent,
    metadata_json: { kind: "onboarding" },
  });

  const { data: session } = await supabase
    .from("client_sessions")
    .select("state_json")
    .eq("id", sessionId)
    .single();

  const prevState = asRecord(session?.state_json);

  const state = {
    ...prevState,
    user: { ...asRecord(prevState.user), name: trimmedName },
    session: { ...asRecord(prevState.session), currentStage: "initial_request" },
  };

  const { data: updatedSession, error } = await supabase
    .from("client_sessions")
    .update({ client_name: trimmedName, current_stage: "initial_request", last_activity_at: now, state_json: state })
    .eq("id", sessionId)
    .select("id, client_email, client_name, status, current_stage, readiness_level, readiness_score")
    .single();

  if (error) throw error;
  return { session: updatedSession, assistantMessage: assistantContent };
}

export async function getSessionMessages(sessionId: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("interview_messages")
    .select("id, role, content, hidden, created_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

// Returns a ReadableStream that streams the AI response token by token.
// The stream ends with a special __META__ JSON payload containing updated session state.
export async function streamClientMessage(
  sessionId: string,
  content: string
): Promise<ReadableStream<Uint8Array>> {
  const trimmed = content.trim();
  if (!trimmed.length) throw new Error("EMPTY_MESSAGE");

  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();
  const encoder = new TextEncoder();

  // Load session state immediately — before streaming starts
  const { data: session, error: sessionError } = await supabase
    .from("client_sessions")
    .select("id, client_email, client_name, current_stage, state_json, working_context_markdown, readiness_score, readiness_level")
    .eq("id", sessionId)
    .single();

  if (sessionError) throw sessionError;

  // Save user message right away — nothing is ever lost
  await supabase.from("interview_messages").insert({
    session_id: sessionId,
    role: "user",
    content: trimmed,
    metadata_json: { kind: session.current_stage },
  });

  // Build conversation history for Sonnet
  const { data: rawMessages } = await supabase
    .from("interview_messages")
    .select("role, content, hidden")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  const allMessages = (rawMessages ?? [])
    .filter((m) => !m.hidden && (m.role === "user" || m.role === "assistant"))
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

  // Anthropic API requires the first message to be from "user".
  // Strip any leading assistant messages (email/code auth messages).
  const firstUserIdx = allMessages.findIndex((m) => m.role === "user");
  const history = firstUserIdx > 0 ? allMessages.slice(firstUserIdx) : allMessages;

  const lower = trimmed.toLowerCase();
  const isExit = EXIT_SIGNALS.some((sig) => {
    const idx = lower.indexOf(sig);
    if (idx === -1) return false;
    const before = idx === 0 || /\W/.test(lower[idx - 1]);
    const after = idx + sig.length === lower.length || /\W/.test(lower[idx + sig.length]);
    return before && after;
  });
  const stateJson = asRecord(session.state_json);
  const ctx = buildInterviewCtx(session, stateJson);

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      let assistantText = "";

      try {
        if (isExit) {
          // Non-streaming exit summary
          assistantText = await generateExitSummary(history, ctx);
          controller.enqueue(encoder.encode(assistantText));
        } else {
          // Streaming interview response
          const generator = streamInterviewResponse(history, ctx);
          let result = await generator.next();
          while (!result.done) {
            controller.enqueue(encoder.encode(result.value));
            assistantText += result.value;
            result = await generator.next();
          }
          if (result.value) assistantText = result.value;
        }

        // Run Haiku analysis in the background while we save
        const analysis = await analyzeAnswer(
          trimmed,
          session.current_stage,
          session.working_context_markdown ?? "",
          stateJson
        );

        // Merge analysis results into state
        const nextState = mergeAnalysisIntoState(stateJson, analysis);
        const contextMarkdown = appendContextMarkdown(
          session.working_context_markdown,
          session.current_stage,
          trimmed,
          nextState
        );

        // Determine next stage
        const nextStage = determineNextStage(
          session.current_stage,
          analysis,
          isExit
        );

        // Save assistant message
        await supabase.from("interview_messages").insert({
          session_id: sessionId,
          role: "assistant",
          content: assistantText,
          metadata_json: { kind: nextStage, layer: analysis.currentLayer },
        });

        // Update session
        const { data: updatedSession } = await supabase
          .from("client_sessions")
          .update({
            current_stage: nextStage,
            working_context_markdown: contextMarkdown,
            state_json: nextState,
            readiness_level: analysis.readinessLevel,
            readiness_score: analysis.readinessScore,
            last_activity_at: now,
            ...(nextState.project ? { initial_request: ((asRecord(nextState.project)).initialRequest as string | undefined) ?? null } : {}),
          })
          .eq("id", sessionId)
          .select("id, client_email, client_name, status, current_stage, readiness_level, readiness_score")
          .single();

        // Save context snapshot
        await supabase.from("context_snapshots").insert({
          session_id: sessionId,
          context_markdown: contextMarkdown,
          state_json: nextState,
        });

        // Auto-generate brief when interview is complete
        let briefToken: string | null = null;
        const shouldGenerateBrief =
          isExit ||
          nextStage === "ready_for_brief" ||
          analysis.readinessScore >= 82;

        if (shouldGenerateBrief) {
          try {
            const doc = await generateClientBrief(sessionId);
            briefToken = (doc as Record<string, unknown>).client_token as string ?? null;

            await supabase
              .from("client_sessions")
              .update({ status: "completed" })
              .eq("id", sessionId);

            // Trigger GitHub Actions sync so the brief appears in the repo immediately
            triggerGitHubSync().catch((e) => console.warn("[sync] GitHub trigger failed:", e));
          } catch (briefErr) {
            console.error("[brief] generateClientBrief failed:", briefErr);
          }
        }

        // Send metadata frame at end of stream
        const meta = JSON.stringify({
          session: updatedSession,
          briefToken,
          fatigue: analysis.fatigueSignal,
          layer: analysis.currentLayer,
          layerComplete: analysis.layerComplete,
        });
        controller.enqueue(encoder.encode(`\n\n__META__${meta}`));
      } catch (err) {
        const message = err instanceof Error ? err.message : "AI_ERROR";
        controller.enqueue(encoder.encode(`\n\n__META__${JSON.stringify({ error: message })}`));
      } finally {
        controller.close();
      }
    },
  });
}

export async function listOwnerSessions(ownerSlug = "default") {
  const supabase = getSupabaseAdmin();
  const { data: owner, error: ownerError } = await supabase
    .from("owners")
    .select("id")
    .eq("link_slug", ownerSlug)
    .single();
  if (ownerError) throw ownerError;

  const { data, error } = await supabase
    .from("client_sessions")
    .select("id, client_email, client_name, status, current_stage, inferred_project_type, initial_request, readiness_level, readiness_score, last_activity_at")
    .eq("owner_id", owner.id)
    .order("last_activity_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return data ?? [];
}

export async function getOwnerSessionDetail(sessionId: string) {
  const supabase = getSupabaseAdmin();

  const { data: session, error: sessionError } = await supabase
    .from("client_sessions")
    .select("id, client_email, client_name, status, current_stage, inferred_project_type, initial_request, working_context_markdown, state_json, readiness_level, readiness_score, last_activity_at, created_at")
    .eq("id", sessionId)
    .single();
  if (sessionError) throw sessionError;

  const { data: messages, error: messagesError } = await supabase
    .from("interview_messages")
    .select("id, role, content, hidden, metadata_json, created_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });
  if (messagesError) throw messagesError;

  const { data: documents, error: documentsError } = await supabase
    .from("generated_documents")
    .select("id, type, language, title, status, client_token, created_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false });
  if (documentsError) throw documentsError;

  return { session, messages: messages ?? [], documents: documents ?? [] };
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function buildInterviewCtx(
  session: { current_stage: string; readiness_score: number; working_context_markdown?: string | null },
  stateJson: Record<string, unknown>
) {
  const facts = asRecord(stateJson.facts);
  const project = asRecord(stateJson.project);
  const readiness = asRecord(stateJson.readiness);
  const currentLayer = (readiness.currentLayer as number) ?? 1;
  const score = (readiness.score as number) ?? session.readiness_score ?? 0;

  const filledAreas: string[] = [];
  const missingAreas: string[] = [];

  const allAreas =
    currentLayer === 1 ? LAYER_1_AREAS :
    currentLayer === 2 ? LAYER_2_AREAS :
    LAYER_3_AREAS;

  const filledMap: Record<string, unknown> = {
    initial_request: project.initialRequest,
    business_context: project.businessDescription,
    desired_change: project.desiredChange,
    audience: (facts.audience as unknown[])?.length ? facts.audience : null,
    deliverables: (facts.deliverables as unknown[])?.length ? facts.deliverables : null,
    style: (facts.styleDirection as unknown[])?.length ? facts.styleDirection : null,
    scope: (facts.inScope as unknown[])?.length ? facts.inScope : null,
    acceptance_criteria: (facts.acceptanceCriteria as unknown[])?.length ? facts.acceptanceCriteria : null,
    risks: (facts.risks as unknown[])?.length ? facts.risks : null,
    timeline: facts.timeline,
    budget: facts.budget,
  };

  for (const area of allAreas) {
    if (filledMap[area]) filledAreas.push(area);
    else missingAreas.push(area);
  }

  const isCheckpoint =
    (currentLayer === 1 && score >= 60 && missingAreas.length === 0) ||
    (currentLayer === 2 && score >= 82 && missingAreas.length === 0);

  return {
    layer: currentLayer,
    readinessScore: score,
    filledAreas,
    missingAreas,
    workingContextMarkdown: session.working_context_markdown ?? "",
    isCheckpoint,
    checkpointLayer: isCheckpoint ? currentLayer : undefined,
  };
}

function mergeAnalysisIntoState(
  prev: Record<string, unknown>,
  analysis: import("./analysisService").AnalysisResult
): Record<string, unknown> {
  const prevProject = asRecord(prev.project);
  const prevFacts = asRecord(prev.facts);
  const prevTaste = asRecord(prev.taste);
  const prevClarity = asRecord(prev.clarity);
  const prevReadiness = asRecord(prev.readiness);

  // Merge arrays by appending unique values
  const mergeArray = (existing: unknown, incoming: unknown): string[] => {
    const base = Array.isArray(existing) ? (existing as string[]) : [];
    const add = Array.isArray(incoming) ? (incoming as string[]) : [];
    const combined = [...base];
    for (const item of add) {
      if (typeof item === "string" && !combined.includes(item)) combined.push(item);
    }
    return combined;
  };

  const nextProject = {
    ...prevProject,
    ...(analysis.projectPatch.initialRequest && { initialRequest: analysis.projectPatch.initialRequest }),
    ...(analysis.projectPatch.businessDescription && { businessDescription: analysis.projectPatch.businessDescription }),
    ...(analysis.projectPatch.desiredChange && { desiredChange: analysis.projectPatch.desiredChange }),
  };

  const fp = analysis.factsPatch;
  const nextFacts = {
    ...prevFacts,
    goals: mergeArray(prevFacts.goals, fp.goals),
    audience: mergeArray(prevFacts.audience, fp.audience),
    deliverables: mergeArray(prevFacts.deliverables, fp.deliverables),
    inScope: mergeArray(prevFacts.inScope, fp.inScope),
    outOfScope: mergeArray(prevFacts.outOfScope, fp.outOfScope),
    acceptanceCriteria: mergeArray(prevFacts.acceptanceCriteria, fp.acceptanceCriteria),
    risks: mergeArray(prevFacts.risks, fp.risks),
    ...(fp.timeline && { timeline: fp.timeline }),
    ...(fp.budget && { budget: fp.budget }),
  };

  const tp = analysis.tastePatch;
  const nextTaste = {
    ...prevTaste,
    clientPhrases: mergeArray(prevTaste.clientPhrases, tp.clientPhrases),
    vagueTerms: mergeArray(prevTaste.vagueTerms, tp.vagueTerms),
    references: mergeArray(prevTaste.references, tp.references),
    avoid: mergeArray(prevTaste.avoid, tp.avoid),
  };

  const nextClarity = { ...prevClarity };
  for (const [area, score] of Object.entries(analysis.clarityUpdates)) {
    if (typeof score === "number") {
      nextClarity[area] = { score, status: clarityStatus(score) };
    }
  }

  const nextReadiness = {
    ...prevReadiness,
    score: analysis.readinessScore,
    level: analysis.readinessLevel,
    currentLayer: analysis.currentLayer,
    layerComplete: analysis.layerComplete,
    canGenerateRawBrief: analysis.readinessScore >= 20,
    canGenerateClientBrief: analysis.readinessScore >= 55,
    importantOpenQuestions: buildOpenQuestions(nextFacts, analysis.currentLayer),
  };

  const contradictions = analysis.detectedContradictions.map((c) => ({
    description: c,
    severity: "medium",
    status: "open",
  }));

  return {
    ...prev,
    project: nextProject,
    facts: nextFacts,
    taste: nextTaste,
    clarity: nextClarity,
    readiness: nextReadiness,
    ...(contradictions.length > 0 ? {
      contradictions: [
        ...((prev.contradictions as unknown[]) ?? []),
        ...contradictions,
      ],
    } : {}),
  };
}

function determineNextStage(
  _currentStage: string,
  analysis: import("./analysisService").AnalysisResult,
  isExit: boolean
): string {
  if (isExit) return "completed_exit";
  if (analysis.readinessScore >= 88) return "ready_for_brief";
  if (analysis.layerComplete && analysis.currentLayer === 1) return "checkpoint_l1";
  if (analysis.layerComplete && analysis.currentLayer === 2) return "ready_for_brief";
  return `layer_${analysis.currentLayer}_ongoing`;
}

function appendContextMarkdown(
  previous: string | null,
  stage: string,
  answer: string,
  state: Record<string, unknown>
): string {
  const project = asRecord(state.project);
  const facts = asRecord(state.facts);
  const readiness = asRecord(state.readiness);

  const lines = [
    (previous ?? "").trim(),
    `\n## Update: ${stage}`,
    `Client answer: ${answer}`,
    `\n## Current Snapshot`,
    `Initial request: ${project.initialRequest ?? "—"}`,
    `Business context: ${project.businessDescription ?? "—"}`,
    `Desired change: ${project.desiredChange ?? "—"}`,
    `Audience: ${fmt(facts.audience)}`,
    `Deliverables: ${fmt(facts.deliverables)}`,
    `Style: ${fmt(facts.styleDirection)}`,
    `Scope: ${fmt(facts.inScope)}`,
    `Acceptance: ${fmt(facts.acceptanceCriteria)}`,
    `Risks: ${fmt(facts.risks)}`,
    `\nReadiness: ${readiness.level ?? "raw_request"} (${readiness.score ?? 0}/100)`,
    `Layer: ${readiness.currentLayer ?? 1}/3`,
  ];

  return lines.filter(Boolean).join("\n") + "\n";
}

function buildOpenQuestions(
  facts: Record<string, unknown>,
  layer: number
): string[] {
  const questions: string[] = [];
  if (!facts.audience?.toString().length) questions.push("Хто є цільовою аудиторією?");
  if (!facts.acceptanceCriteria?.toString().length) questions.push("Як ви визначите що результат готовий?");
  if (layer >= 2 && !facts.inScope?.toString().length) questions.push("Що точно входить у задачу?");
  if (layer >= 2 && !facts.risks?.toString().length) questions.push("Які ризики варто врахувати?");
  return questions;
}

function clarityStatus(score: number): string {
  if (score <= 20) return "missing";
  if (score <= 45) return "weak";
  if (score <= 70) return "partial";
  return "clear";
}

function fmt(value: unknown): string {
  if (Array.isArray(value) && value.length > 0) return value.join("; ");
  if (typeof value === "string" && value.trim()) return value;
  return "—";
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};
}
