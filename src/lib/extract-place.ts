export type ExtractedCategory =
  | "HOTEL"
  | "RESTAURANT"
  | "VIEWPOINT"
  | "ACTIVITY"
  | "TRANSPORT";

export type ExtractedPlace = {
  name: string;
  city: string;
  country: string;
  category: ExtractedCategory;
  description: string;
};

export const extractedPlaceJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    places: {
      type: "array",
      minItems: 1,
      maxItems: 12,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string", minLength: 1 },
          city: { type: "string", minLength: 1 },
          country: { type: "string", minLength: 1 },
          category: {
            type: "string",
            enum: ["HOTEL", "RESTAURANT", "VIEWPOINT", "ACTIVITY", "TRANSPORT"],
          },
          description: {
            type: "string",
            minLength: 1,
            description: "2-3 sentences.",
          },
        },
        required: ["name", "city", "country", "category", "description"],
      },
    },
  },
  required: ["places"],
} as const;

export function isProbablyUrl(input: string): boolean {
  try {
    const u = new URL(input);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

