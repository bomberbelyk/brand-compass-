import { requestEmailCode } from "@/server/services/authService";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    const result = await requestEmailCode(String(email ?? ""));

    return Response.json({
      ok: true,
      email: result.email,
      devCode: result.devCode,
      session: result.session,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    const status = message === "INVALID_EMAIL" ? 400 : 500;

    return Response.json({ ok: false, error: message }, { status });
  }
}
