import Link from "next/link";
import { listOwnerSessions } from "@/server/services/sessionService";

export const dynamic = "force-dynamic";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("uk-UA", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function OwnerDefaultPage() {
  const sessions = await listOwnerSessions("default");

  return (
    <main className="owner-page">
      <div className="owner-shell">
        <header className="owner-header">
          <div>
            <h1 className="owner-title">Owner View</h1>
            <p className="owner-description">
              Interview statuses, readiness, open questions, and generated briefs will appear here.
            </p>
          </div>
          <Link href="/" className="outline-button">
            Chat
          </Link>
        </header>

        <section className="sessions-table">
          <div className="sessions-row header">
            <span>Client</span>
            <span>Status</span>
            <span>Readiness</span>
            <span>Score</span>
            <span>Updated</span>
          </div>

          {sessions.length === 0 ? (
            <div className="sessions-row body">
              <span>No sessions yet</span>
              <span>waiting</span>
              <span>raw_request</span>
              <span>0</span>
              <span className="muted">Start the first interview to see it here.</span>
            </div>
          ) : (
            sessions.map((session) => (
              <div key={session.id} className="sessions-row body">
                <span>{session.client_name || session.client_email}</span>
                <span>
                  {session.status}
                  <br />
                  <span className="muted">{session.current_stage}</span>
                </span>
                <span>
                  {session.readiness_level}
                  <br />
                  <span className="muted">{session.initial_request || "No request yet"}</span>
                </span>
                <span>{session.readiness_score}</span>
                <span>
                  <Link href={`/owner/default/sessions/${session.id}`}>Open</Link>
                  <br />
                  <span className="muted">{formatDate(session.last_activity_at)}</span>
                </span>
              </div>
            ))
          )}
        </section>
      </div>
    </main>
  );
}
