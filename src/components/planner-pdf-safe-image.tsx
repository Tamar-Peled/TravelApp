import type { ComponentProps } from "react";
import { Image } from "@react-pdf/renderer";

/**
 * Wraps @react-pdf Image: only passes http(s) or data:image URLs so loaders
 * skip junk strings (reduces fontkit/DataView issues from bad assets).
 */
export function SafeImage({
  src,
  style,
}: {
  src: string | null | undefined;
  style?: ComponentProps<typeof Image>["style"];
}) {
  if (src == null || typeof src !== "string") return null;
  const t = src.trim();
  if (t.length < 8) return null;
  if (!/^https?:\/\//i.test(t) && !t.startsWith("data:image/")) return null;
  return <Image src={t} style={style} />;
}
