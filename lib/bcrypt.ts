import bcrypt from "bcryptjs";

import { getOptionalIntEnv } from "@/lib/env";

const DEFAULT_SALT_ROUNDS = 12;

function getSaltRounds(): number {
  return getOptionalIntEnv("BCRYPT_SALT_ROUNDS", DEFAULT_SALT_ROUNDS, {
    min: 8,
    max: 15,
  });
}

export async function hashPassword(plainTextPassword: string): Promise<string> {
  return bcrypt.hash(plainTextPassword, getSaltRounds());
}

export async function verifyPassword(
  plainTextPassword: string,
  hashedPassword: string,
): Promise<boolean> {
  return bcrypt.compare(plainTextPassword, hashedPassword);
}
