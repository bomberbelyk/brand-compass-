import Link from "next/link";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    id: string;
    documentId: string;
  }>;
};

export default async function OwnerDocumentPage({ params }: PageProps) {
  const { id, documentId } = await params;
  const supabase = getSupabaseAdmin();
  const { data: document, error } = await supabase
    .from("generated_documents")
    .select("id, title, type, language, status, content_markdown, created_at")
    .eq("id", documentId)
    .eq("session_id", id)
    .single();

  if (error) throw error;

  return (
    <main className="owner-page">
      <div className="owner-shell">
        <header className="owner-header">
          <div>
            <Link href={`/owner/default/sessions/${id}`} className="muted">
              ← Back to session
            </Link>
            <h1 className="owner-title session-title">{document.title}</h1>
            <p className="owner-description">
              {document.type} · {document.language} · {document.status}
            </p>
          </div>
        </header>

        <section className="detail-card">
          <pre className="context-preview document-preview">{document.content_markdown}</pre>
        </section>
      </div>
    </main>
  );
}
