const REPO = "bomberbelyk/brand-compass-";
const API = `https://api.github.com/repos/${REPO}/contents`;

function headers(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json",
  };
}

async function getFileSha(path: string, token: string): Promise<string | null> {
  const res = await fetch(`${API}/${path}`, { headers: headers(token) });
  if (!res.ok) return null;
  const data = await res.json() as { sha?: string };
  return data.sha ?? null;
}

async function putFile(path: string, content: string, message: string, token: string) {
  const sha = await getFileSha(path, token);
  const res = await fetch(`${API}/${path}`, {
    method: "PUT",
    headers: headers(token),
    body: JSON.stringify({
      message,
      content: Buffer.from(content).toString("base64"),
      ...(sha ? { sha } : {}),
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GitHub PUT ${path}: ${res.status} ${err.slice(0, 120)}`);
  }
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 40)
    .replace(/^-+|-+$/g, "") || "unnamed";
}

function sessionStatus(stage: string, lastActivityAt: string | null): string {
  if (stage === "completed" || stage === "completed_exit") return "✅ completed";
  const idle = (Date.now() - new Date(lastActivityAt ?? 0).getTime()) / 3_600_000;
  if (idle > 48) return "⚠️ interrupted";
  return "🟡 in_progress";
}

export interface GitHubSyncPayload {
  sessionId: string;
  clientName: string | null;
  clientEmail: string | null;
  createdAt: string;
  lastActivityAt: string;
  currentStage: string;
  readinessScore: number;
  readinessLevel: string;
  messages: Array<{ role: string; content: string }>;
  briefContent?: string | null;
}

export async function pushSessionToGitHub(payload: GitHubSyncPayload): Promise<void> {
  const token = process.env.GITHUB_ACTIONS_TOKEN;
  if (!token) return;

  const date = new Date(payload.createdAt).toISOString().slice(0, 10);
  const slug = slugify(payload.clientName ?? "");
  const shortId = payload.sessionId.slice(0, 6);
  const dir = `briefs/${date}-${slug}-${shortId}`;

  const status = sessionStatus(payload.currentStage, payload.lastActivityAt);

  const stateMd = `# ${payload.clientName ?? "Unnamed"} — ${status}

| Field | Value |
|-------|-------|
| Session ID | \`${payload.sessionId}\` |
| Email | ${payload.clientEmail ?? "—"} |
| Stage | ${payload.currentStage} |
| Readiness | ${payload.readinessScore}/100 (${payload.readinessLevel}) |
| Started | ${new Date(payload.createdAt).toISOString().slice(0, 16).replace("T", " ")} UTC |
| Last activity | ${new Date(payload.lastActivityAt).toISOString().slice(0, 16).replace("T", " ")} UTC |
`;

  const transcriptMd = `# Transcript — ${payload.clientName ?? "Unnamed"}

${payload.messages.map((m) => {
    const speaker = m.role === "assistant" ? "**Brand Compass**" : "**Client**";
    return `### ${speaker}\n\n${m.content}`;
  }).join("\n\n---\n\n")}
`;

  const commitMsg = `sync: ${payload.clientName ?? "unnamed"} — ${payload.readinessScore}/100`;

  await Promise.all([
    putFile(`${dir}/state.md`, stateMd, commitMsg, token),
    putFile(`${dir}/transcript.md`, transcriptMd, commitMsg, token),
    ...(payload.briefContent
      ? [putFile(
          `${dir}/brief.md`,
          `# Brief — ${payload.clientName ?? "Unnamed"}\n\n---\n\n${payload.briefContent}\n`,
          commitMsg,
          token
        )]
      : []),
  ]);
}
