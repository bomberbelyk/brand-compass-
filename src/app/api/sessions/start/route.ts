import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { buildOnboardingMessage } from "@/server/services/sessionService";
import { getAIClient, INTERVIEW_MODEL } from "@/lib/ai";
import { INTERVIEW_SYSTEM_PROMPT, buildInterviewContext } from "@/lib/prompts";

export async function POST(req: NextRequest) {
  const { name } = (await req.json()) as { name?: string };
  if (!name?.trim()) {
    return NextResponse.json({ error: "Name required" }, { status: 400 });
  }

  const cleanName = name.trim();
  const supabase = getSupabaseAdmin();

  const { data: owner, error: ownerError } = await supabase
    .from("owners")
    .select("id")
    .eq("link_slug", "default")
    .single();

  if (ownerError) return NextResponse.json({ error: ownerError.message }, { status: 500 });

  // Look for an existing active session with this name
  const { data: existing } = await supabase
    .from("client_sessions")
    .select("id, client_email, client_name, status, current_stage, readiness_level, readiness_score")
    .eq("owner_id", owner.id)
    .ilike("client_name", cleanName)
    .in("status", ["active", "paused", "abandoned", "completed"])
    .gt("readiness_score", 0)
    .order("readiness_score", { ascending: false })
    .order("last_activity_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    const { data: rawMessages } = await supabase
      .from("interview_messages")
      .select("role, content, hidden, metadata_json")
      .eq("session_id", existing.id)
      .order("created_at", { ascending: true });

    // Exclude onboarding/hint messages from the visible restored history
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

    // Fetch session state for context
    const { data: fullSession } = await supabase
      .from("client_sessions")
      .select("state_json, working_context_markdown, readiness_score")
      .eq("id", existing.id)
      .single();

    const stateJson = (fullSession?.state_json ?? {}) as Record<string, unknown>;
    const readiness = (stateJson.readiness ?? {}) as Record<string, unknown>;
    const currentLayer = (readiness.currentLayer as number) ?? 1;
    const score = (readiness.score as number) ?? existing.readiness_score ?? 0;

    const ctx = buildInterviewContext({
      layer: currentLayer,
      readinessScore: score,
      filledAreas: [],
      missingAreas: [],
      workingContextMarkdown: fullSession?.working_context_markdown ?? "",
      isCheckpoint: false,
    });

    // Generate welcome-back + next question in one Sonnet call
    const ai = getAIClient();
    const response = await ai.messages.create({
      model: INTERVIEW_MODEL,
      max_tokens: 400,
      system: [
        { type: "text", text: INTERVIEW_SYSTEM_PROMPT },
        { type: "text", text: ctx + `\n\nINSTRUCTION: The client has returned to continue the interview. In one message: greet them warmly in one short sentence (say you're continuing from where you left off), then immediately ask the next most important question based on what has already been covered. Do NOT ask about things already discussed.` },
      ],
      messages: history.length > 0 ? history.slice(-20) : [{ role: "user", content: `Мене звати ${existing.client_name}` }],
    });

    const block = response.content[0];
    const returningMessage = block.type === "text" ? block.text : `З поверненням, ${existing.client_name}! Продовжуємо з місця, де зупинились.`;

    await Promise.all([
      supabase.from("interview_messages").insert({
        session_id: existing.id,
        role: "assistant",
        content: returningMessage,
        metadata_json: { kind: "returning_greeting" },
      }),
      supabase.from("client_sessions").update({
        status: "active",
        current_stage: "initial_framing",
        last_activity_at: new Date().toISOString(),
      }).eq("id", existing.id),
    ]);

    return NextResponse.json({
      session: existing,
      assistantMessage: returningMessage,
      messages: chatMessages.map((m) => ({ role: m.role as "assistant" | "user", content: m.content })),
      isReturning: true,
    });
  }

  // New session
  const placeholderEmail = `anon-${randomUUID()}@reqarch.local`;
  const now = new Date().toISOString();

  const { data: session, error: sessionError } = await supabase
    .from("client_sessions")
    .insert({
      owner_id: owner.id,
      client_email: placeholderEmail,
      client_name: cleanName,
      status: "active",
      current_stage: "initial_framing",
      detected_language: "uk",
      document_language: "auto",
      last_activity_at: now,
      state_json: createInitialState(cleanName),
    })
    .select("id, client_email, client_name, status, current_stage, readiness_level, readiness_score")
    .single();

  if (sessionError) return NextResponse.json({ error: sessionError.message }, { status: 500 });

  const hintMessage = "Наступного разу, для того, щоб продовжити роботу над брифом, просто напишіть своє ім'я.";
  const onboardingMessage = buildOnboardingMessage(cleanName);

  await supabase.from("interview_messages").insert([
    {
      session_id: session.id,
      role: "assistant",
      content: hintMessage,
      metadata_json: { kind: "return_hint" },
    },
    {
      session_id: session.id,
      role: "assistant",
      content: onboardingMessage,
      metadata_json: { kind: "onboarding" },
    },
  ]);

  return NextResponse.json({
    session,
    hintMessage,
    assistantMessage: onboardingMessage,
    isReturning: false,
  });
}

function createInitialState(name: string) {
  return {
    user: {
      name,
      detectedLanguage: "uk",
      documentLanguage: "auto",
    },
    session: {
      status: "active",
      currentStage: "initial_framing",
      deferredQuestions: [],
    },
    facts: {
      goals: [],
      audience: [],
      deliverables: [],
      constraints: [],
      stakeholders: [],
      approvers: [],
      acceptanceCriteria: [],
      inScope: [],
      outOfScope: [],
      openQuestions: [],
    },
    taste: {
      clientPhrases: [],
      vagueTerms: [],
      references: [],
      avoid: [],
    },
    contradictions: [],
    delegatedDecisions: [],
    readiness: {
      level: "raw_request",
      score: 0,
      canGenerateRawBrief: false,
      canGenerateClientBrief: false,
      blockingQuestions: [],
      importantOpenQuestions: [],
    },
  };
}
