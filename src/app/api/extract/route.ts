import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import {
  extractedPlaceJsonSchema,
  isProbablyUrl,
  type ExtractedPlace,
} from "@/lib/extract-place";
import { googlePlacesTextSearch } from "@/lib/google-places";
import { getOpenAIClient } from "@/lib/openai";

type ExtractRequestBody = {
  sourceUrl?: string;
  text?: string;
};

type EnrichedPlace = ExtractedPlace & {
  sourceUrl: string | null;
  formattedAddress: string | null;
  latitude: number | null;
  longitude: number | null;
  photoReference: string | null;
};

type ExtractedPlacesPayload = { places: ExtractedPlace[] };

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") ?? "";
    let tripId: string | undefined;
    let sourceUrl: string | undefined;
    let text: string | undefined;
    let imageDataUrl: string | undefined;

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      sourceUrl = (form.get("sourceUrl")?.toString() || "").trim() || undefined;
      text = (form.get("text")?.toString() || "").trim() || undefined;
      const file = form.get("image");
      if (file && file instanceof File && file.size > 0) {
        const bytes = new Uint8Array(await file.arrayBuffer());
        const b64 = Buffer.from(bytes).toString("base64");
        const mime = file.type || "image/png";
        imageDataUrl = `data:${mime};base64,${b64}`;
      }
    } else {
      const body = (await req.json()) as ExtractRequestBody;
      sourceUrl = body.sourceUrl?.trim();
      text = body.text?.trim();
    }

    if (!sourceUrl && !text && !imageDataUrl) {
      return NextResponse.json(
        { error: "Provide sourceUrl, text, or image" },
        { status: 400 },
      );
    }
    if (sourceUrl && !isProbablyUrl(sourceUrl)) {
      return NextResponse.json(
        { error: "Invalid URL. Must start with http(s)://" },
        { status: 400 },
      );
    }

    try {
      void (await requireUserId());
    } catch (e) {
      if (e instanceof Error && e.message === "UNAUTHORIZED") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      throw e;
    }

    let client: ReturnType<typeof getOpenAIClient>;
    try {
      client = getOpenAIClient();
    } catch (err) {
      return NextResponse.json(
        {
          error:
            err instanceof Error
              ? err.message
              : "OPENAI_API_KEY is not set",
        },
        { status: 500 },
      );
    }
    const promptParts: string[] = [];
    if (sourceUrl) promptParts.push(`SOURCE_URL:\n${sourceUrl}`);
    if (text) promptParts.push(`TEXT:\n${text}`);
    const input = promptParts.join("\n\n");

    // OpenAI Structured Outputs (JSON Schema) for strict extraction.
    const resp = await client.responses.create({
      model: "gpt-4o",
      temperature: 0.2,
      text: {
        format: {
          type: "json_schema",
          name: "place_extract",
          strict: true,
          schema: extractedPlaceJsonSchema,
        },
      },
      input: [
        {
          role: "system",
          content:
            "Extract travel places from the provided input (URL/text and/or screenshot). " +
            "Return an object with a places array matching the JSON schema. " +
            "description must be 2-3 sentences per place. " +
            "Only include real places; dedupe near-duplicates.",
        },
        {
          role: "user",
          content:
            "Return a best-effort extraction of ALL places mentioned. If city/country are unclear, infer from context.\n\n" +
            input,
        },
        ...(imageDataUrl
          ? [
              {
                role: "user" as const,
                content: [
                  {
                    type: "input_text" as const,
                    text: "Screenshot attached. Read it and extract all places.",
                  },
                  {
                    type: "input_image" as const,
                    image_url: imageDataUrl,
                    detail: "low" as const,
                  },
                ],
              },
            ]
          : []),
      ],
    });

    const raw = resp.output_text;
    if (!raw) {
      return NextResponse.json(
        { error: "Extraction failed" },
        { status: 502 },
      );
    }
    let extracted: ExtractedPlace[];
    try {
      const parsed = JSON.parse(raw) as ExtractedPlacesPayload;
      extracted = parsed.places;
    } catch {
      return NextResponse.json(
        { error: "Extraction returned invalid JSON" },
        { status: 502 },
      );
    }
    if (!Array.isArray(extracted) || extracted.length === 0) {
      return NextResponse.json({ error: "No places found" }, { status: 404 });
    }

    const googleKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!googleKey) {
      return NextResponse.json(
        { error: "GOOGLE_MAPS_API_KEY is not set" },
        { status: 500 },
      );
    }

    const enriched: EnrichedPlace[] = [];
    for (const item of extracted.slice(0, 12)) {
      const e = await googlePlacesTextSearch({
        apiKey: googleKey,
        name: item.name,
        city: item.city,
        country: item.country,
      });
      enriched.push({
        ...item,
        sourceUrl: sourceUrl ?? null,
        formattedAddress: e.formattedAddress,
        latitude: e.latitude,
        longitude: e.longitude,
        photoReference: e.photoReference,
      });
    }

    return NextResponse.json({
      google: {
        // Indicates at least one item matched.
        found: enriched.some((p) => Boolean(p.formattedAddress || p.latitude || p.photoReference)),
        status: "OK",
        placeId: null,
      },
      extracted,
      enriched,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to extract place" },
      { status: 500 },
    );
  }
}

