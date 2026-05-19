import { streamClientMessage } from "@/server/services/sessionService";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { content } = await request.json();

    const stream = await streamClientMessage(id, String(content ?? ""));

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    const status = message === "EMPTY_MESSAGE" ? 400 : 500;
    return Response.json({ ok: false, error: message }, { status });
  }
}
