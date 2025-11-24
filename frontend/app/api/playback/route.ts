import { NextResponse } from "next/server";

import { getPlaybackBootstrap } from "../../lib/track/service";
import { streamTelemetryFrames } from "../../lib/track/loader";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const session = (searchParams.get("session") ?? "race1") as "race1" | "race2";
  const bootstrap = await getPlaybackBootstrap(session);

  if (searchParams.get("mode") === "bootstrap") {
    return NextResponse.json(bootstrap);
  }

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ bootstrap })}\n\n`)
      );
      for await (const frame of streamTelemetryFrames(session)) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ frame })}\n\n`)
        );
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      Connection: "keep-alive",
      "Cache-Control": "no-cache",
    },
  });
}
