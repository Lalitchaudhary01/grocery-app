export function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getOptionalIntEnv(
  name: string,
  fallback: number,
  options?: { min?: number; max?: number },
): number {
  const raw = process.env[name];
  if (!raw) return fallback;

  const parsed = Number(raw);
  if (!Number.isInteger(parsed)) return fallback;

  if (typeof options?.min === "number" && parsed < options.min) return fallback;
  if (typeof options?.max === "number" && parsed > options.max) return fallback;

  return parsed;
}
