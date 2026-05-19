import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getAIClient, INTERVIEW_MODEL } from "@/lib/ai";
import { INTERVIEW_SYSTEM_PROMPT, buildInterviewContext } from "@/lib/prompts";

export async function POST(req: NextRequest) {
  const { sessionId } = (await req.json()) as { sessionId?: string };
  if (!sessionId) return NextResponse.json({ error: "sessionId required" }, { status: 400 });

  const supabase = getSupabaseAdmin();

  const { data: session, error } = await supabase
    .from("client_sessions")
    .select("id, client_email, client_name, status, current_stage, readiness_level, readiness_score, state_json, working_context_markdown")
    .eq("id", sessionId)
    .single();

  if (error || !session) {
    console.error("[resume] session not found:", sessionId, error?.message);
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  // Check if a brief already exists for this session
  const { data: existingDoc } = await supabase
    .from("generated_documents")
    .select("client_token")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const existingBriefToken = existingDoc?.client_token ?? null;

  const { data: rawMessages } = await supabase
    .from("interview_messages")
    .select("role, content, hidden, metadata_json")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  const SYSTEM_KINDS = new Set(["return_hint", "onboarding", "returning_greeting"]);
  const chatMessages = (rawMessages ?? []).filter((m) => {
    if (m.hidden) return false;
    const kind = (m.metadata_json as Record<string, unknown> | null)?.kind as string | undefined;
    return !kind || !SYSTEM_KINDS.has(kind);
  });

  const history = chatMessages.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  // Generate continuation question — fallback to static message if AI fails
  let assistantMessage = `З поверненням, ${session.client_name}! Продовжуємо. Що хотіли б доповнити або уточнити?`;

  try {
    const stateJson = (session.state_json ?? {}) as Record<string, unknown>;
    const readiness = (stateJson.readiness ?? {}) as Record<string, unknown>;
    const facts = (stateJson.facts ?? {}) as Record<string, unknown>;
    const project = (stateJson.project ?? {}) as Record<string, unknown>;
    const currentLayer = (readiness.currentLayer as number) ?? 1;
    const score = (readiness.score as number) ?? session.readiness_score ?? 0;

    // Build filled/missing areas so AI knows exactly what to propose next
    const LAYER_AREAS: Record<number, string[]> = {
      1: ["initial_request", "business_context", "desired_change", "audience", "deliverables", "style"],
      2: ["scope", "acceptance_criteria", "risks", "timeline", "budget"],
      3: ["stakeholders", "technical_constraints", "edge_cases", "revision_process"],
    };
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
    const areas = LAYER_AREAS[currentLayer] ?? LAYER_AREAS[1];
    const filledAreas = areas.filter((a) => filledMap[a]);
    const missingAreas = areas.filter((a) => !filledMap[a]);

    const ctx = buildInterviewContext({
      layer: currentLayer,
      readinessScore: score,
      filledAreas,
      missingAreas,
      workingContextMarkdown: session.working_context_markdown ?? "",
      isCheckpoint: false,
    });

    const ai = getAIClient();

    // API requires conversation to end with a user message
    const historySlice = history.slice(-20);
    if (historySlice.length > 0 && historySlice[historySlice.length - 1].role === "assistant") {
      historySlice.push({ role: "user", content: "Я повернувся до роботи над брифом." });
    }

    const response = await ai.messages.create({
      model: INTERVIEW_MODEL,
      max_tokens: 350,
      system: [
        { type: "text", text: INTERVIEW_SYSTEM_PROMPT },
        {
          type: "text",
          text: ctx + `\n\nINSTRUCTION: Returning client. The filled areas above are already covered. The missing areas are what still need to be explored. Pick the single most important missing area, name it explicitly, explain in one sentence why it matters for the designer, and ask a specific question about it. Do NOT ask "що хотіли б доповнити?" — you are the guide, propose the direction yourself.`,
        },
      ],
      messages: historySlice.length > 0
        ? historySlice
        : [{ role: "user", content: `Мене звати ${session.client_name}. Я повернувся до роботи над брифом.` }],
    });

    const block = response.content[0];
    if (block.type === "text") assistantMessage = block.text;
  } catch (aiErr) {
    console.error("[resume] AI call failed, using fallback:", aiErr);
  }

  // Persist the greeting and update session status
  await Promise.all([
    supabase.from("interview_messages").insert({
      session_id: sessionId,
      role: "assistant",
      content: assistantMessage,
      metadata_json: { kind: "returning_greeting" },
    }),
    supabase.from("client_sessions").update({
      status: "active",
      last_activity_at: new Date().toISOString(),
    }).eq("id", sessionId),
  ]);

  return NextResponse.json({
    session: {
      id: session.id,
      client_email: session.client_email,
      client_name: session.client_name,
      status: "active",
      current_stage: session.current_stage,
      readiness_level: session.readiness_level,
      readiness_score: session.readiness_score,
    },
    messages: chatMessages.map((m) => ({ role: m.role as "assistant" | "user", content: m.content })),
    assistantMessage,
    briefToken: existingBriefToken,
  });
}
