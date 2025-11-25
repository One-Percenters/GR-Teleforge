import { NextResponse } from "next/server";

import { getPlaybackBootstrap } from "../../lib/track/service";
import { streamTelemetryFrames } from "../../lib/track/loader";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const session = (searchParams.get("session") ?? "race1") as
      | "race1"
      | "race2";

    // Return early if just checking connection
    if (searchParams.get("ping") === "true") {
      return NextResponse.json({ status: "ok", session });
    }

    let bootstrap: {
      session: typeof session;
      raceResults: any[];
      classResults: any[];
      latestWeather: any;
      sampleTelemetry: any;
    };
    try {
      bootstrap = await getPlaybackBootstrap(session);
    } catch (error) {
      console.error("Error loading bootstrap:", error);
      // Return a minimal bootstrap if data files don't exist
      bootstrap = {
        session,
        raceResults: [],
        classResults: [],
        latestWeather: null,
        sampleTelemetry: null,
      };
    }

    if (searchParams.get("mode") === "bootstrap") {
      return NextResponse.json(bootstrap);
    }

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ bootstrap })}\n\n`)
          );

          try {
            for await (const frame of streamTelemetryFrames(session)) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ frame })}\n\n`)
              );
            }
          } catch (streamError) {
            console.error("Error streaming telemetry frames:", streamError);
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  error: "Stream error",
                  details: String(streamError),
                })}\n\n`
              )
            );
          }

          controller.close();
        } catch (error) {
          console.error("Error in stream start:", error);
          controller.error(error);
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        Connection: "keep-alive",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("Error in playback route:", error);
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    );
  }
}
