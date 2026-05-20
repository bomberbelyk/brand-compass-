import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { pushSessionToGitHub } from "@/lib/github";

export async function POST(req: NextRequest) {
  const { sessionId } = (await req.json()) as { sessionId?: string };
  if (!sessionId) return NextResponse.json({ error: "sessionId required" }, { status: 400 });

  const supabase = getSupabaseAdmin();

  const { data: session, error } = await supabase
    .from("client_sessions")
    .select("id, client_email, client_name, current_stage, readiness_score, readiness_level, created_at, last_activity_at")
    .eq("id", sessionId)
    .single();

  if (error || !session) return NextResponse.json({ error: "session not found" }, { status: 404 });

  const { data: rawMessages } = await supabase
    .from("interview_messages")
    .select("role, content, hidden")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  const messages = (rawMessages ?? [])
    .filter((m) => !m.hidden && (m.role === "user" || m.role === "assistant"))
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

  const { data: briefDoc } = await supabase
    .from("generated_documents")
    .select("content_markdown")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  await pushSessionToGitHub({
    sessionId: session.id,
    clientName: session.client_name,
    clientEmail: session.client_email,
    createdAt: session.created_at,
    lastActivityAt: session.last_activity_at ?? new Date().toISOString(),
    currentStage: session.current_stage,
    readinessScore: session.readiness_score ?? 0,
    readinessLevel: session.readiness_level ?? "raw_request",
    messages,
    briefContent: briefDoc?.content_markdown ?? null,
  });

  return NextResponse.json({ ok: true });
}
