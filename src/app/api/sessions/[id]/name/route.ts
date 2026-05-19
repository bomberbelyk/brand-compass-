import { setClientName } from "@/server/services/sessionService";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { name } = await request.json();
    const result = await setClientName(id, String(name ?? ""));

    return Response.json({
      ok: true,
      session: result.session,
      assistantMessage: result.assistantMessage,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    const status = message === "INVALID_NAME" ? 400 : 500;

    return Response.json({ ok: false, error: message }, { status });
  }
}

