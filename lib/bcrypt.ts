import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

import { getOptionalIntEnv } from "@/lib/env";

const scrypt = promisify(scryptCallback);
const DEFAULT_SALT_ROUNDS = 12;
const KEY_LENGTH = 64;

function getSaltRounds(): number {
  return getOptionalIntEnv("BCRYPT_SALT_ROUNDS", DEFAULT_SALT_ROUNDS, {
    min: 10,
    max: 14,
  });
}

function deriveCostFactor(rounds: number): number {
  return 2 ** rounds;
}

export async function hashPassword(plainTextPassword: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const rounds = getSaltRounds();
  const cost = deriveCostFactor(rounds);
  const derivedKey = (await scrypt(plainTextPassword, salt, KEY_LENGTH, {
    N: cost,
    r: 8,
    p: 1,
  })) as Buffer;

  return `scrypt$${rounds}$${salt}$${derivedKey.toString("hex")}`;
}

export async function verifyPassword(
  plainTextPassword: string,
  hashedPassword: string,
): Promise<boolean> {
  const [algorithm, roundsString, salt, hashHex] = hashedPassword.split("$");
  if (algorithm !== "scrypt" || !roundsString || !salt || !hashHex) {
    return false;
  }

  const rounds = Number(roundsString);
  if (!Number.isInteger(rounds) || rounds < 10 || rounds > 14) {
    return false;
  }

  const cost = deriveCostFactor(rounds);
  const derivedKey = (await scrypt(plainTextPassword, salt, KEY_LENGTH, {
    N: cost,
    r: 8,
    p: 1,
  })) as Buffer;

  const expectedKey = Buffer.from(hashHex, "hex");
  if (expectedKey.length !== derivedKey.length) {
    return false;
  }

  return timingSafeEqual(derivedKey, expectedKey);
}
