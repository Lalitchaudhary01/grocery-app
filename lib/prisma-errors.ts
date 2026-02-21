export function hasPrismaErrorCode(error: unknown, code: string): boolean {
  if (!error || typeof error !== "object") return false;
  const maybe = error as { code?: unknown };
  return typeof maybe.code === "string" && maybe.code === code;
}
