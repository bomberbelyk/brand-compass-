import { verifyEmailCode } from "@/server/services/authService";
import { getSessionMessages } from "@/server/services/sessionService";

export async function POST(request: Request) {
  try {
    const { email, code } = await request.json();
    const result = await verifyEmailCode(String(email ?? ""), String(code ?? ""));
    const messages = await getSessionMessages(result.session.id);

    return Response.json({
      ok: true,
      session: result.session,
      isReturning: result.isReturning,
      messages,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    const status = ["INVALID_CODE", "EXPIRED_CODE"].includes(message) ? 400 : 500;

    return Response.json({ ok: false, error: message }, { status });
  }
}

