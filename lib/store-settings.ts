import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type StoreSettings = {
  isOpen: boolean;
  nextOpenAt: string | null;
  message: string | null;
};

const DEFAULT_SETTINGS: StoreSettings = {
  isOpen: true,
  nextOpenAt: null,
  message: null,
};

function getSettingsPath() {
  return path.join(process.cwd(), "data", "store-settings.json");
}

export async function getStoreSettings(): Promise<StoreSettings> {
  try {
    const raw = await readFile(getSettingsPath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<StoreSettings>;
    return {
      isOpen: typeof parsed.isOpen === "boolean" ? parsed.isOpen : true,
      nextOpenAt: typeof parsed.nextOpenAt === "string" ? parsed.nextOpenAt : null,
      message: typeof parsed.message === "string" ? parsed.message : null,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function updateStoreSettings(
  patch: Partial<StoreSettings>,
): Promise<StoreSettings> {
  const current = await getStoreSettings();
  const next: StoreSettings = {
    ...current,
    ...patch,
    nextOpenAt:
      typeof patch.nextOpenAt === "string"
        ? patch.nextOpenAt
        : patch.nextOpenAt === null
          ? null
          : current.nextOpenAt,
    message:
      typeof patch.message === "string"
        ? patch.message
        : patch.message === null
          ? null
          : current.message,
  };
  const filePath = getSettingsPath();
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(next, null, 2), "utf8");
  return next;
}

