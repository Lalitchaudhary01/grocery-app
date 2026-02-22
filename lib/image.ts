function isCloudinaryImageUrl(value: string): boolean {
  return value.includes("res.cloudinary.com") && value.includes("/image/upload/");
}

export function normalizeProductImageUrl(source: string | null | undefined): string | null {
  if (!source) return null;
  const trimmed = source.trim();
  if (!trimmed) return null;
  return trimmed;
}

export function optimizeImageUrl(
  source: string | null | undefined,
  options?: {
    width?: number;
    height?: number;
  },
): string | null {
  const normalized = normalizeProductImageUrl(source);
  if (!normalized) return null;
  if (!isCloudinaryImageUrl(normalized)) return normalized;

  const transformations = ["f_auto", "q_auto"];
  if (typeof options?.width === "number" && options.width > 0) {
    transformations.push(`w_${Math.round(options.width)}`);
  }
  if (typeof options?.height === "number" && options.height > 0) {
    transformations.push(`h_${Math.round(options.height)}`, "c_fill");
  }

  const marker = "/image/upload/";
  const markerIndex = normalized.indexOf(marker);
  if (markerIndex < 0) return normalized;

  const prefix = normalized.slice(0, markerIndex + marker.length);
  const suffix = normalized.slice(markerIndex + marker.length);
  const suffixHead = suffix.split("/")[0] ?? "";
  if (suffixHead.includes("f_auto") || suffixHead.includes("q_auto")) {
    return normalized;
  }

  return `${prefix}${transformations.join(",")}/${suffix}`;
}
