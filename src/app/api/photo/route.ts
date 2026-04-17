import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const ref = searchParams.get("ref")?.trim();
  const maxwidth = searchParams.get("maxwidth")?.trim() ?? "640";

  if (!ref) {
    return NextResponse.json({ error: "ref is required" }, { status: 400 });
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GOOGLE_MAPS_API_KEY is not set" },
      { status: 500 },
    );
  }

  const url =
    "https://maps.googleapis.com/maps/api/place/photo" +
    `?maxwidth=${encodeURIComponent(maxwidth)}` +
    `&photo_reference=${encodeURIComponent(ref)}` +
    `&key=${encodeURIComponent(apiKey)}`;

  const upstream = await fetch(url, {
    method: "GET",
    redirect: "follow",
  });

  if (!upstream.ok) {
    return NextResponse.json(
      { error: "Failed to fetch photo" },
      { status: 502 },
    );
  }

  const contentType = upstream.headers.get("content-type") ?? "image/jpeg";
  const bytes = new Uint8Array(await upstream.arrayBuffer());

  return new NextResponse(bytes, {
    status: 200,
    headers: {
      "content-type": contentType,
      "cache-control": "public, max-age=86400",
    },
  });
}

