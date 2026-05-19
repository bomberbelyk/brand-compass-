import Link from "next/link";
import { getOwnerSessionDetail } from "@/server/services/sessionService";
import { GenerateBriefButton } from "./GenerateBriefButton";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("uk-UA", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function getOpenQuestions(state: unknown) {
  if (!state || typeof state !== "object") return [];
  const readiness = (state as { readiness?: unknown }).readiness;
  if (!readiness || typeof readiness !== "object") return [];
  const questions = (readiness as { importantOpenQuestions?: unknown }).importantOpenQuestions;
  return Array.isArray(questions) ? questions.filter((item): item is string => typeof item === "string") : [];
}

export default async function OwnerSessionDetailPage({ params }: PageProps) {
  const { id } = await params;
  const { session, messages, documents } = await getOwnerSessionDetail(id);
  const openQuestions = getOpenQuestions(session.state_json);

  return (
    <main className="owner-page">
      <div className="owner-shell">
        <header className="owner-header">
          <div>
            <Link href="/owner/default" className="muted">
              ← Back to sessions
            </Link>
            <h1 className="owner-title session-title">
              {session.client_name || session.client_email}
            </h1>
            <p className="owner-description">
              {session.status} · {session.current_stage} · updated {formatDate(session.last_activity_at)}
            </p>
          </div>
          <Link href="/" className="outline-button">
            Chat
          </Link>
        </header>

        <section className="detail-grid">
          <div className="detail-card">
            <h2>Session</h2>
            <dl className="meta-list">
              <div>
                <dt>Email</dt>
                <dd>{session.client_email}</dd>
              </div>
              <div>
                <dt>Name</dt>
                <dd>{session.client_name || "Unknown"}</dd>
              </div>
              <div>
                <dt>Initial request</dt>
                <dd>{session.initial_request || "Not captured yet"}</dd>
              </div>
              <div>
                <dt>Readiness</dt>
                <dd>
                  {session.readiness_level} · {session.readiness_score}/100
                </dd>
              </div>
              <div>
                <dt>Created</dt>
                <dd>{formatDate(session.created_at)}</dd>
              </div>
            </dl>
          </div>

          <div className="detail-card">
            <h2>Open Questions</h2>
            {openQuestions.length === 0 ? (
              <p className="muted">No important open questions recorded.</p>
            ) : (
              <ul className="plain-list">
                {openQuestions.map((question) => (
                  <li key={question}>{question}</li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="detail-card">
          <h2>Transcript</h2>
          <div className="transcript-list">
            {messages.length === 0 ? (
              <p className="muted">No messages yet.</p>
            ) : (
              messages.map((message) => (
                <article key={message.id} className={`transcript-message ${message.role}`}>
                  <div className="transcript-meta">
                    <strong>{message.role}</strong>
                    <span>{formatDate(message.created_at)}</span>
                    {message.hidden ? <span>hidden</span> : null}
                  </div>
                  <p>{message.content}</p>
                </article>
              ))
            )}
          </div>
        </section>

        <section className="detail-card">
          <h2>Working Context Markdown</h2>
          <pre className="context-preview">
            {session.working_context_markdown || "No context yet."}
          </pre>
        </section>

        <section className="detail-card">
          <h2>Generated Documents</h2>
          <GenerateBriefButton sessionId={session.id} />
          {documents.length === 0 ? (
            <p className="muted">No generated documents yet.</p>
          ) : (
            <ul className="plain-list">
              {documents.map((document) => (
                <li key={document.id}>
                  <Link href={`/owner/default/sessions/${session.id}/documents/${document.id}`}>
                    {document.title}
                  </Link>{" "}
                  · {document.type} · {document.status}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
