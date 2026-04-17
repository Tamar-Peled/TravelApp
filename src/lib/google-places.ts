export type GooglePlacesEnrichment = {
  formattedAddress: string | null;
  latitude: number | null;
  longitude: number | null;
  photoReference: string | null;
  placeId: string | null;
};

type TextSearchResponse = {
  status: string;
  results: Array<{
    formatted_address?: string;
    place_id?: string;
    geometry?: { location?: { lat?: number; lng?: number } };
    photos?: Array<{ photo_reference?: string }>;
  }>;
  error_message?: string;
};

export async function googlePlacesTextSearch(input: {
  apiKey: string;
  name: string;
  city: string;
  country?: string;
}): Promise<GooglePlacesEnrichment & { found: boolean; status: string }> {
  const q = [input.name, input.city, input.country].filter(Boolean).join(", ");
  const url =
    "https://maps.googleapis.com/maps/api/place/textsearch/json" +
    `?query=${encodeURIComponent(q)}` +
    `&key=${encodeURIComponent(input.apiKey)}`;

  const res = await fetch(url, { method: "GET" });
  if (!res.ok) {
    return {
      found: false,
      status: `http_${res.status}`,
      formattedAddress: null,
      latitude: null,
      longitude: null,
      photoReference: null,
      placeId: null,
    };
  }

  const data = (await res.json()) as TextSearchResponse;
  const first = data.results?.[0];

  if (!first) {
    return {
      found: false,
      status: data.status || "NO_RESULTS",
      formattedAddress: null,
      latitude: null,
      longitude: null,
      photoReference: null,
      placeId: null,
    };
  }

  const lat = first.geometry?.location?.lat ?? null;
  const lng = first.geometry?.location?.lng ?? null;
  const photoRef = first.photos?.[0]?.photo_reference ?? null;

  return {
    found: true,
    status: data.status || "OK",
    formattedAddress: first.formatted_address ?? null,
    latitude: typeof lat === "number" ? lat : null,
    longitude: typeof lng === "number" ? lng : null,
    photoReference: photoRef,
    placeId: first.place_id ?? null,
  };
}

