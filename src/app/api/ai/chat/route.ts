import { orchestrateChat } from "@/lib/ai/agent/orchestrate";
import { parseChatRequest } from "@/lib/ai/agent/contracts";
import { createServerToolContext } from "@/lib/ai/adapters/http";
import {
  isOpenRouterConfigured,
  OpenRouterModelProvider,
} from "@/lib/ai/model/openrouter";
import { edgeToolRegistry } from "@/lib/ai/tools";
import { getCurrentUser } from "@/lib/persistence/auth/getCurrentUser";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  let chatRequest;
  try {
    chatRequest = parseChatRequest(body);
  } catch {
    return NextResponse.json({ error: "Invalid chat request" }, { status: 400 });
  }

  if (!isOpenRouterConfigured()) {
    return NextResponse.json(
      {
        error: "OPENROUTER_API_KEY is not configured",
        code: "missing_openrouter_key",
      },
      { status: 503 },
    );
  }

  const provider = new OpenRouterModelProvider();
  const encoder = new TextEncoder();
  const user = await getCurrentUser();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of orchestrateChat({
          request: chatRequest,
          provider,
          registry: edgeToolRegistry,
          createContext: createServerToolContext,
          signal: request.signal,
          userId: user?.id ?? null,
        })) {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Stream failed";
        controller.enqueue(
          encoder.encode(
            `${JSON.stringify({
              type: "error",
              code: "stream_error",
              message,
            })}\n`,
          ),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-cache",
    },
  });
}
