type ParsedCategoryName = {
  icon: string | null;
  imageUrl: string | null;
  label: string;
};

const EMOJI_PATTERN = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
const IMAGE_PREFIX_PATTERN = /^\[\[img:(.+?)\]\]\s*(.*)$/i;

export function parseCategoryName(value: string): ParsedCategoryName {
  const trimmed = value.trim();
  if (!trimmed) {
    return { icon: null, imageUrl: null, label: "" };
  }

  const imageMatch = IMAGE_PREFIX_PATTERN.exec(trimmed);
  if (imageMatch) {
    const imageUrl = imageMatch[1]?.trim() || "";
    const label = imageMatch[2]?.trim() || trimmed;
    return {
      icon: null,
      imageUrl: imageUrl || null,
      label,
    };
  }

  const parts = trimmed.split(/\s+/);
  const first = parts[0] ?? "";

  if (EMOJI_PATTERN.test(first)) {
    const rest = parts.slice(1).join(" ").trim();
    return {
      icon: first,
      imageUrl: null,
      label: rest || trimmed,
    };
  }

  return {
    icon: null,
    imageUrl: null,
    label: trimmed,
  };
}

export function buildCategoryName(label: string, imageUrl?: string | null): string {
  const cleanLabel = label.trim();
  const cleanImageUrl = (imageUrl ?? "").trim();
  if (!cleanLabel) return "";
  if (!cleanImageUrl) return cleanLabel;
  return `[[img:${cleanImageUrl}]] ${cleanLabel}`;
}
