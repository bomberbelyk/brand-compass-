import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getAIClient, INTERVIEW_MODEL } from "@/lib/ai";
import { randomUUID } from "crypto";

type SessionForBrief = {
  id: string;
  client_email: string;
  client_name: string | null;
  initial_request: string | null;
  working_context_markdown: string;
  state_json: unknown;
  readiness_level: string;
  readiness_score: number;
};

type InterviewMessage = {
  role: string;
  content: string;
  hidden: boolean | null;
};

export async function generateClientBrief(sessionId: string) {
  const supabase = getSupabaseAdmin();

  const [{ data: session, error: sessionError }, { data: rawMessages }] = await Promise.all([
    supabase
      .from("client_sessions")
      .select(
        "id, client_email, client_name, initial_request, working_context_markdown, state_json, readiness_level, readiness_score"
      )
      .eq("id", sessionId)
      .single(),
    supabase
      .from("interview_messages")
      .select("role, content, hidden")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true }),
  ]);

  if (sessionError) throw sessionError;

  const messages = (rawMessages ?? []).filter(
    (m: InterviewMessage) => !m.hidden && m.role !== "system"
  );

  const language = detectBriefLanguage(session.state_json);
  const rawData = extractRawData(session);

  let brief: string;
  try {
    brief = await refineBriefWithSonnet(rawData, messages, language, session);
  } catch (err) {
    console.error("Sonnet brief refinement failed, falling back to raw build:", err);
    brief = buildFallbackBrief(session);
  }

  const title = session.client_name || session.client_email;
  const type = session.readiness_level === "raw_request" ? "raw_brief" : "client_brief";
  const clientToken = randomUUID();

  const { data: document, error: documentError } = await supabase
    .from("generated_documents")
    .insert({
      session_id: sessionId,
      type,
      language,
      title,
      content_markdown: brief,
      status: "ready",
      client_token: clientToken,
    })
    .select("id, type, language, title, content_markdown, status, client_token, created_at")
    .single();

  if (documentError) throw documentError;

  return document;
}

async function refineBriefWithSonnet(
  rawData: Record<string, unknown>,
  messages: InterviewMessage[],
  language: string,
  session: SessionForBrief
): Promise<string> {
  const isUk = language === "uk";

  const langInstruction = isUk
    ? "Мова документу: українська. Всі заголовки та весь текст — лише українською."
    : "Document language: English. All headings and all content — in English only.";

  const sectionNames = isUk
    ? {
        title: "Бриф",
        client: "Клієнт",
        overview: "Опис проєкту",
        context: "Бізнес-контекст",
        goal: "Мета",
        audience: "Цільова аудиторія",
        character: "Характер бренду",
        references: "Візуальні референси",
        avoid: "Чого уникати",
        result: "Очікуваний результат",
        scope: "Обсяг роботи",
        acceptance: "Критерії прийняття",
        risks: "Ризики",
        questions: "Відкриті питання",
      }
    : {
        title: "Project Brief",
        client: "Client",
        overview: "Project Overview",
        context: "Business Context",
        goal: "Goal",
        audience: "Target Audience",
        character: "Brand Character",
        references: "Visual References",
        avoid: "What to Avoid",
        result: "Expected Result",
        scope: "Scope",
        acceptance: "Acceptance Criteria",
        risks: "Risks",
        questions: "Open Questions",
      };

  const transcript = messages
    .map((m) => `[${m.role === "assistant" ? "Інтерв'юер" : "Клієнт"}]: ${m.content}`)
    .join("\n\n");

  const prompt = `${langInstruction}

Ти — старший бренд-стратег, який готує фінальний бриф на основі проведеного інтерв'ю.

ЗАВДАННЯ:
Прочитай сирі дані інтерв'ю та розмову. Склади професійний бриф, який буде зрозумілим і клієнту, і дизайнеру.

ПРАВИЛА:
1. ${langInstruction}
2. Не цитуй розмову дослівно — переформулюй усе в нейтральну, чітку, ділову мову.
3. Включай лише ті розділи, по яких є реальні дані. Порожніх розділів не додавай.
4. Без метафор, без розмовних зворотів, без "клієнт сказав що...". Тільки факти і характеристики.
5. Бриф має читатись як самостійний документ — без контексту розмови.
6. Зберігай суть і точність, але переклади на мову специфікації.

СТРУКТУРА (використовуй лише розділи з даними):
# ${sectionNames.title}: ${session.client_name || ""}
## ${sectionNames.overview}
## ${sectionNames.context}
## ${sectionNames.goal}
## ${sectionNames.audience}
## ${sectionNames.character}
## ${sectionNames.references}
## ${sectionNames.avoid}
## ${sectionNames.result}
## ${sectionNames.scope}
## ${sectionNames.acceptance}
## ${sectionNames.risks}
## ${sectionNames.questions}

СИРІ ДАНІ З ІНТЕРВ'Ю:
${JSON.stringify(rawData, null, 2)}

ТРАНСКРИПТ РОЗМОВИ:
${transcript}

Напиши бриф зараз.`;

  const ai = getAIClient();
  const response = await ai.messages.create({
    model: INTERVIEW_MODEL,
    max_tokens: 2048,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("");

  return text.trim();
}

function extractRawData(session: SessionForBrief): Record<string, unknown> {
  const state = asRecord(session.state_json);
  return {
    clientName: session.client_name,
    initialRequest: session.initial_request,
    project: state.project,
    facts: state.facts,
    taste: state.taste,
    readiness: state.readiness,
    delegatedDecisions: state.delegatedDecisions,
  };
}

function buildFallbackBrief(session: SessionForBrief): string {
  const state = asRecord(session.state_json);
  const project = asRecord(state.project);
  const facts = asRecord(state.facts);
  const taste = asRecord(state.taste);
  const readiness = asRecord(state.readiness);

  const sections: string[] = [`# Brief: ${session.client_name || session.client_email}`, ``];

  const overview = project.initialRequest ?? session.initial_request;
  if (hasValue(overview)) sections.push(`## Overview`, ``, overview as string, ``);
  if (hasValue(project.businessDescription))
    sections.push(`## Context`, ``, project.businessDescription as string, ``);

  const goal = hasValue(project.desiredChange)
    ? (project.desiredChange as string)
    : toStringList(facts.goals).join("; ");
  if (goal.trim()) sections.push(`## Goal`, ``, goal, ``);

  const audience = toStringList(facts.audience);
  if (audience.length) sections.push(`## Audience`, ``, audience.map((i) => `- ${i}`).join("\n"), ``);

  const phrases = toStringList(taste.clientPhrases);
  if (phrases.length) sections.push(`## Brand Character`, ``, phrases.map((i) => `- ${i}`).join("\n"), ``);

  const refs = toStringList(taste.references);
  if (refs.length) sections.push(`## References`, ``, refs.map((i) => `- ${i}`).join("\n"), ``);

  const avoid = toStringList(taste.avoid);
  if (avoid.length) sections.push(`## Avoid`, ``, avoid.map((i) => `- ${i}`).join("\n"), ``);

  const deliverables = toStringList(facts.deliverables);
  if (deliverables.length) sections.push(`## Deliverables`, ``, deliverables.map((i) => `- ${i}`).join("\n"), ``);

  const openQ = toStringList(readiness.importantOpenQuestions);
  if (openQ.length) sections.push(`## Open Questions`, ``, openQ.map((i) => `- ${i}`).join("\n"), ``);

  sections.push(`## Readiness`, ``, `Score: ${session.readiness_score}/100`, ``);

  return sections.join("\n");
}

function detectBriefLanguage(state: unknown) {
  const user = asRecord(asRecord(state).user);
  const documentLanguage = typeof user.documentLanguage === "string" ? user.documentLanguage : "auto";
  const detectedLanguage = typeof user.detectedLanguage === "string" ? user.detectedLanguage : "uk";
  if (documentLanguage === "uk" || documentLanguage === "en") return documentLanguage;
  if (detectedLanguage === "en") return "en";
  return "uk";
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function toStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function hasValue(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}
