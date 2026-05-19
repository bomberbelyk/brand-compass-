import { getSupabaseAdmin } from "@/lib/supabase/server";

const CODE_TTL_MINUTES = 10;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function createDevCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function requestEmailCode(email: string) {
  const normalizedEmail = normalizeEmail(email);

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new Error("INVALID_EMAIL");
  }

  const supabase = getSupabaseAdmin();
  const code = createDevCode();
  const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000).toISOString();
  const now = new Date().toISOString();

  const { error } = await supabase.from("verification_codes").insert({
    email: normalizedEmail,
    code,
    expires_at: expiresAt,
  });

  if (error) throw error;

  const { data: owner, error: ownerError } = await supabase
    .from("owners")
    .select("id")
    .eq("link_slug", "default")
    .single();

  if (ownerError) throw ownerError;

  const { data: existingSession, error: sessionLookupError } = await supabase
    .from("client_sessions")
    .select("id, client_email, client_name, status, current_stage, readiness_level, readiness_score")
    .eq("owner_id", owner.id)
    .eq("client_email", normalizedEmail)
    .in("status", ["email_pending", "code_pending", "active", "paused", "abandoned"])
    .order("last_activity_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (sessionLookupError) throw sessionLookupError;

  let session = existingSession;

  if (session) {
    const { data: updatedSession, error: updateError } = await supabase
      .from("client_sessions")
      .update({
        status: "code_pending",
        current_stage: "code",
        last_activity_at: now,
      })
      .eq("id", session.id)
      .select("id, client_email, client_name, status, current_stage, readiness_level, readiness_score")
      .single();

    if (updateError) throw updateError;
    session = updatedSession;
  } else {
    const { data: newSession, error: createError } = await supabase
      .from("client_sessions")
      .insert({
        owner_id: owner.id,
        client_email: normalizedEmail,
        status: "code_pending",
        current_stage: "code",
        detected_language: "uk",
        document_language: "auto",
        last_activity_at: now,
        state_json: createInitialState(normalizedEmail, "code", "code_pending"),
      })
      .select("id, client_email, client_name, status, current_stage, readiness_level, readiness_score")
      .single();

    if (createError) throw createError;
    session = newSession;
  }

  await supabase.from("interview_messages").insert([
    {
      session_id: session.id,
      role: "assistant",
      content:
        "Вітаю. Я допоможу перетворити нечіткий запит на робочий бриф для виконавця.\n\nЩоб зберегти розмову і дати вам можливість повернутись пізніше, напишіть, будь ласка, ваш email.",
      metadata_json: {
        kind: "initial_greeting",
      },
    },
    {
      session_id: session.id,
      role: "user",
      content: normalizedEmail,
      metadata_json: {
        kind: "client_email",
      },
    },
    {
      session_id: session.id,
      role: "assistant",
      content:
        process.env.DEV_SHOW_EMAIL_CODE === "true"
          ? `Я створив dev-код для прототипу: ${code}\n\nВведіть його тут, і ми продовжимо.`
          : "Я надіслав код на вашу пошту. Введіть його тут, і ми продовжимо.",
      metadata_json: {
        kind: "verification_code_prompt",
      },
    },
  ]);

  return {
    email: normalizedEmail,
    devCode: process.env.DEV_SHOW_EMAIL_CODE === "true" ? code : undefined,
    session,
  };
}

export async function verifyEmailCode(email: string, code: string) {
  const normalizedEmail = normalizeEmail(email);
  const normalizedCode = code.trim();
  const supabase = getSupabaseAdmin();

  const { data: verificationCode, error: codeError } = await supabase
    .from("verification_codes")
    .select("id, expires_at")
    .eq("email", normalizedEmail)
    .eq("code", normalizedCode)
    .is("consumed_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (codeError) throw codeError;
  if (!verificationCode) throw new Error("INVALID_CODE");
  if (new Date(verificationCode.expires_at).getTime() < Date.now()) {
    throw new Error("EXPIRED_CODE");
  }

  const { error: consumeError } = await supabase
    .from("verification_codes")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", verificationCode.id);

  if (consumeError) throw consumeError;

  const { data: owner, error: ownerError } = await supabase
    .from("owners")
    .select("id")
    .eq("link_slug", "default")
    .single();

  if (ownerError) throw ownerError;

  const { data: existingSession, error: sessionLookupError } = await supabase
    .from("client_sessions")
    .select("id, client_email, client_name, status, current_stage, readiness_level, readiness_score")
    .eq("owner_id", owner.id)
    .eq("client_email", normalizedEmail)
    .in("status", ["active", "paused", "abandoned", "code_pending", "email_pending"])
    .order("last_activity_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (sessionLookupError) throw sessionLookupError;

  if (existingSession) {
    await supabase.from("interview_messages").insert({
      session_id: existingSession.id,
      role: "user",
      content: normalizedCode,
      hidden: true,
      metadata_json: {
        kind: "verification_code",
      },
    });

    const { data: updatedSession, error: updateError } = await supabase
      .from("client_sessions")
      .update({
        status: "active",
        last_activity_at: new Date().toISOString(),
      })
      .eq("id", existingSession.id)
      .select("id, client_email, client_name, status, current_stage, readiness_level, readiness_score")
      .single();

    if (updateError) throw updateError;

    return {
      session: updatedSession,
      isReturning: true,
    };
  }

  const { data: newSession, error: createError } = await supabase
    .from("client_sessions")
    .insert({
      owner_id: owner.id,
      client_email: normalizedEmail,
      status: "active",
      current_stage: "name",
      detected_language: "uk",
      document_language: "auto",
      state_json: createInitialState(normalizedEmail, "name", "active"),
    })
    .select("id, client_email, client_name, status, current_stage, readiness_level, readiness_score")
    .single();

  if (createError) throw createError;

  await supabase.from("interview_messages").insert({
    session_id: newSession.id,
    role: "user",
    content: normalizedCode,
    hidden: true,
    metadata_json: {
      kind: "verification_code",
    },
  });

  return {
    session: newSession,
    isReturning: false,
  };
}

function createInitialState(email: string, currentStage: string, status: string) {
  return {
    user: {
      email,
      detectedLanguage: "uk",
      documentLanguage: "auto",
    },
    session: {
      status,
      currentStage,
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
