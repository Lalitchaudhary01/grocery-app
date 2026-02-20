export type ProductMeta = {
  mrp?: number | null;
  unit?: string | null;
  discountPercent?: number | null;
  isActive?: boolean | null;
  variantGroup?: string | null;
  variantRank?: number | null;
};

export type ParsedProductDescription = {
  description: string | null;
  meta: ProductMeta;
};

const META_PREFIX = "\n\n[META]";

function normalizeText(value: string | null | undefined): string | null {
  const normalized = (value ?? "").trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeMeta(meta?: ProductMeta): ProductMeta {
  const mrp =
    typeof meta?.mrp === "number" && Number.isFinite(meta.mrp) && meta.mrp > 0
      ? meta.mrp
      : null;
  const discountPercent =
    typeof meta?.discountPercent === "number" &&
    Number.isFinite(meta.discountPercent) &&
    meta.discountPercent >= 0 &&
    meta.discountPercent <= 90
      ? meta.discountPercent
      : null;
  const unit = normalizeText(meta?.unit);
  const isActive =
    typeof meta?.isActive === "boolean"
      ? meta.isActive
      : meta?.isActive === null
        ? null
        : true;
  const variantGroup = normalizeText(meta?.variantGroup);
  const variantRank =
    typeof meta?.variantRank === "number" && Number.isFinite(meta.variantRank)
      ? meta.variantRank
      : null;

  return {
    mrp,
    unit,
    discountPercent,
    isActive,
    variantGroup,
    variantRank,
  };
}

export function encodeProductDescription(
  description: string | null | undefined,
  meta?: ProductMeta,
): string | null {
  const plainDescription = normalizeText(description);
  const normalizedMeta = normalizeMeta(meta);
  const payload = JSON.stringify(normalizedMeta);
  return `${plainDescription ?? ""}${META_PREFIX}${payload}`;
}

export function parseProductDescription(rawDescription: string | null | undefined): ParsedProductDescription {
  const fallback: ParsedProductDescription = {
    description: normalizeText(rawDescription),
      meta: {
        mrp: null,
        unit: null,
        discountPercent: null,
        isActive: true,
        variantGroup: null,
        variantRank: null,
      },
    };

  if (!rawDescription) return fallback;

  const markerIndex = rawDescription.lastIndexOf(META_PREFIX);
  if (markerIndex === -1) return fallback;

  const descriptionPart = rawDescription.slice(0, markerIndex);
  const metaPart = rawDescription.slice(markerIndex + META_PREFIX.length);

  try {
    const parsed: unknown = JSON.parse(metaPart);
    if (!parsed || typeof parsed !== "object") return fallback;
    const normalizedMeta = normalizeMeta(parsed as ProductMeta);
    return {
      description: normalizeText(descriptionPart),
      meta: normalizedMeta,
    };
  } catch {
    return fallback;
  }
}
