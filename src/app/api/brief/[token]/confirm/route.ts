import { getSupabaseAdmin } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ token: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const { token } = await context.params;
    const supabase = getSupabaseAdmin();

    // Verify token exists before confirming
    const { data: doc } = await supabase
      .from("generated_documents")
      .select("id")
      .eq("client_token", token)
      .single();

    if (!doc) {
      return Response.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
    }

    await supabase
      .from("generated_documents")
      .update({ client_confirmed_at: new Date().toISOString() })
      .eq("client_token", token);

    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
