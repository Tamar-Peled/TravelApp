/**
 * Built-in PDF fonts only — avoids @react-pdf/fontkit DataView / woff2 subset issues.
 * (Inter and other custom fonts are disabled until loaded via valid .ttf if reintroduced.)
 */
export const PDF_BUILTIN_FONTS = {
  regular: "Helvetica",
  bold: "Helvetica-Bold",
} as const;

/** Reserved for future .ttf-based registration; currently always returns built-in fonts. */
export async function preparePlannerPdfFonts(): Promise<{
  regular: string;
  bold: string;
}> {
  return { ...PDF_BUILTIN_FONTS };
}
