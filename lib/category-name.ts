type ParsedCategoryName = {
  icon: string | null;
  label: string;
};

const EMOJI_PATTERN = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;

export function parseCategoryName(value: string): ParsedCategoryName {
  const trimmed = value.trim();
  if (!trimmed) {
    return { icon: null, label: "" };
  }

  const parts = trimmed.split(/\s+/);
  const first = parts[0] ?? "";

  if (EMOJI_PATTERN.test(first)) {
    const rest = parts.slice(1).join(" ").trim();
    return {
      icon: first,
      label: rest || trimmed,
    };
  }

  return {
    icon: null,
    label: trimmed,
  };
}

export function buildCategoryName(label: string, icon?: string | null): string {
  const cleanLabel = label.trim();
  const cleanIcon = (icon ?? "").trim();
  if (!cleanLabel) return "";
  if (!cleanIcon) return cleanLabel;
  return `${cleanIcon} ${cleanLabel}`;
}

