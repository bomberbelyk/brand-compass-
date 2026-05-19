import { getSupabaseAdmin } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import BriefConfirmButton from "./BriefConfirmButton";
import BriefContent from "./BriefContent";
import BackToEditButton from "./BackToEditButton";

type PageProps = {
  params: Promise<{ token: string }>;
};

export default async function BriefPage({ params }: PageProps) {
  const { token } = await params;
  const supabase = getSupabaseAdmin();

  const { data: doc } = await supabase
    .from("generated_documents")
    .select("id, title, content_markdown, status, client_confirmed_at, session_id")
    .eq("client_token", token)
    .single();

  if (!doc) notFound();

  const { data: session } = await supabase
    .from("client_sessions")
    .select("client_name, readiness_level, readiness_score")
    .eq("id", doc.session_id)
    .single();

  const isConfirmed = !!doc.client_confirmed_at;
  const readinessLabel: Record<string, string> = {
    raw_request: "Початковий запит",
    early_brief: "Ранній бриф",
    working_brief: "Робочий бриф",
    production_brief: "Фінальний бриф",
  };

  return (
    <main className="brief-shell">
      <header className="brief-header">
        <div className="brief-header-inner">
          <div className="brief-brand">Request Architect</div>
          <div className="brief-meta-row">
            {session && (
              <>
                <span className="brief-badge">
                  {readinessLabel[session.readiness_level] ?? session.readiness_level}
                </span>
                <span className="brief-score">{session.readiness_score}/100</span>
              </>
            )}
            {isConfirmed && (
              <span className="brief-badge brief-badge--confirmed">Підтверджено</span>
            )}
          </div>
        </div>
      </header>

      <div className="brief-body">
        <div className="brief-card">
          <h1 className="brief-title">{doc.title}</h1>
          <BriefContent markdown={doc.content_markdown} />
        </div>

        {!isConfirmed && (
          <div className="brief-actions">
            <p className="brief-actions-hint">
              Перевірте бриф. Якщо всі пункти відображають ваші думки правильно — підтвердіть його.
              Якщо щось потребує уточнення, зверніться до виконавця.
            </p>
            <BriefConfirmButton documentId={doc.id} token={token} />
          </div>
        )}

        {isConfirmed && (
          <div className="brief-confirmed-banner">
            Бриф підтверджено. Виконавець може починати роботу.
          </div>
        )}

        <div className="brief-back-wrap">
          <BackToEditButton sessionId={doc.session_id} />
        </div>
      </div>
    </main>
  );
}
