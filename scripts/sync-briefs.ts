/**
 * Syncs Supabase sessions → briefs/ directory.
 *
 * Run: npx tsx scripts/sync-briefs.ts
 * CI:  runs via .github/workflows/sync-briefs.yml
 *
 * Each session → briefs/YYYY-MM-DD-{slug}/
 *   state.md       — status, scores, timestamps
 *   transcript.md  — full interview (assistant + user)
 *   brief.md       — generated brief if completed
 */

import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const BRIEFS_DIR = path.join(process.cwd(), "briefs");

function slugify(name: string): string {
  // Keep Latin and Cyrillic, lowercase, spaces → dashes
  return name
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 40)
    .replace(/^-+|-+$/g, "");
}

function sessionStatus(session: {
  status: string;
  current_stage: string;
  last_activity_at: string | null;
}): { emoji: string; label: string } {
  if (session.status === "completed" || session.current_stage === "completed" || session.current_stage === "completed_exit") {
    return { emoji: "✅", label: "completed" };
  }
  // No activity in the last 48 hours → interrupted
  const lastActivity = session.last_activity_at
    ? new Date(session.last_activity_at).getTime()
    : 0;
  const hoursIdle = (Date.now() - lastActivity) / 3_600_000;
  if (hoursIdle > 48) {
    return { emoji: "⚠️", label: "interrupted" };
  }
  return { emoji: "🟡", label: "in_progress" };
}

function formatMessages(
  messages: Array<{ role: string; content: string; created_at: string; metadata_json?: unknown }>
): string {
  if (messages.length === 0) return "_No messages yet._\n";

  return messages
    .map((m) => {
      const time = new Date(m.created_at).toISOString().slice(0, 16).replace("T", " ");
      const speaker = m.role === "assistant" ? "**Brand Compass**" : "**Client**";
      return `### ${speaker} · ${time}\n\n${m.content}\n`;
    })
    .join("\n---\n\n");
}

async function run() {
  const { data: sessions, error } = await supabase
    .from("client_sessions")
    .select(
      "id, client_name, client_email, status, current_stage, readiness_level, readiness_score, created_at, last_activity_at"
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch sessions:", error.message);
    process.exit(1);
  }

  console.log(`Syncing ${sessions?.length ?? 0} sessions…`);

  let created = 0;
  let updated = 0;

  for (const session of sessions ?? []) {
    const date = new Date(session.created_at).toISOString().slice(0, 10);
    const slug = slugify(session.client_name ?? "") || "unnamed";
    const shortId = session.id.slice(0, 6);
    const dirName = `${date}-${slug}-${shortId}`;
    const dirPath = path.join(BRIEFS_DIR, dirName);

    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      created++;
    } else {
      updated++;
    }

    const { emoji, label } = sessionStatus(session);

    // ── state.md ──────────────────────────────────────────────────
    const stateContent = `# ${session.client_name ?? "Unnamed"} — ${emoji} ${label}

| Field | Value |
|-------|-------|
| Session ID | \`${session.id}\` |
| Email | ${session.client_email ?? "—"} |
| Status | ${label} |
| Stage | ${session.current_stage ?? "—"} |
| Readiness | ${session.readiness_score ?? 0}/100 (${session.readiness_level ?? "raw_request"}) |
| Started | ${new Date(session.created_at).toISOString().slice(0, 16).replace("T", " ")} UTC |
| Last activity | ${session.last_activity_at ? new Date(session.last_activity_at).toISOString().slice(0, 16).replace("T", " ") + " UTC" : "—"} |
`;
    fs.writeFileSync(path.join(dirPath, "state.md"), stateContent);

    // ── transcript.md ─────────────────────────────────────────────
    const { data: messages } = await supabase
      .from("interview_messages")
      .select("role, content, created_at, metadata_json")
      .eq("session_id", session.id)
      .order("created_at", { ascending: true });

    const visibleMessages = (messages ?? []).filter((m) => {
      if (m.hidden) return false;
      const kind = (m.metadata_json as Record<string, unknown> | null)?.kind as string | undefined;
      return !kind || !["return_hint", "onboarding", "returning_greeting"].includes(kind);
    });

    const transcriptContent = `# Transcript — ${session.client_name ?? "Unnamed"}

${formatMessages(visibleMessages)}
`;
    fs.writeFileSync(path.join(dirPath, "transcript.md"), transcriptContent);

    // ── brief.md (only if generated) ─────────────────────────────
    const { data: doc } = await supabase
      .from("generated_documents")
      .select("content_markdown, created_at")
      .eq("session_id", session.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (doc?.content_markdown) {
      const briefContent = `# Brief — ${session.client_name ?? "Unnamed"}

_Generated: ${new Date(doc.created_at).toISOString().slice(0, 16).replace("T", " ")} UTC_

---

${doc.content_markdown}
`;
      fs.writeFileSync(path.join(dirPath, "brief.md"), briefContent);
    }
  }

  console.log(`Done. Created: ${created}, updated: ${updated}.`);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
