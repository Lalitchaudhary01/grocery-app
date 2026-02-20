function hasQueryParam(url: string, key: string): boolean {
  try {
    const value = new URL(url);
    return value.searchParams.has(key);
  } catch {
    return false;
  }
}

export function normalizeProductImageUrl(raw: string | null | undefined): string | null {
  const value = (raw ?? "").trim();
  if (!value) return null;

  try {
    const url = new URL(value);

    // Best-effort optimization for remote hosts that support transform params.
    if (!hasQueryParam(url.toString(), "w")) url.searchParams.set("w", "1200");
    if (!hasQueryParam(url.toString(), "q")) url.searchParams.set("q", "80");
    if (!hasQueryParam(url.toString(), "auto")) url.searchParams.set("auto", "format");
    if (!hasQueryParam(url.toString(), "fit")) url.searchParams.set("fit", "crop");

    return url.toString();
  } catch {
    return value;
  }
}

