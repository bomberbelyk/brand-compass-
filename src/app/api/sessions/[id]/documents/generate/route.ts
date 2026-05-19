import { generateClientBrief } from "@/server/services/documentService";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const document = await generateClientBrief(id);

    return Response.json({
      ok: true,
      document,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";

    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
