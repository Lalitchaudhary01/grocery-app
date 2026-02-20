import { createHmac, timingSafeEqual } from "node:crypto";

import { getRequiredEnv } from "@/lib/env";

export type AuthRole = "ADMIN" | "CUSTOMER";

export interface AuthJwtPayload {
  sub: string;
  email: string;
  role: AuthRole;
  iat?: number;
  exp?: number;
}

type JwtExpiresIn = `${number}${"s" | "m" | "h" | "d"}` | number;

const DEFAULT_EXPIRES_IN: JwtExpiresIn = "7d";

function getJwtSecret(): string {
  return getRequiredEnv("JWT_SECRET");
}

function base64UrlEncode(value: string): string {
  return Buffer.from(value).toString("base64url");
}

function base64UrlDecode(value: string): string {
  return Buffer.from(value, "base64url").toString();
}

function parseExpiresInToSeconds(expiresIn: JwtExpiresIn): number {
  if (typeof expiresIn === "number") return expiresIn;

  const match = /^(\d+)([smhd])$/.exec(expiresIn);
  if (!match) return 7 * 24 * 60 * 60;

  const amount = Number(match[1]);
  const unit = match[2];

  switch (unit) {
    case "s":
      return amount;
    case "m":
      return amount * 60;
    case "h":
      return amount * 60 * 60;
    case "d":
      return amount * 24 * 60 * 60;
    default:
      return 7 * 24 * 60 * 60;
  }
}

function signHs256(input: string, secret: string): string {
  return createHmac("sha256", secret).update(input).digest("base64url");
}

export function signAuthToken(
  payload: Omit<AuthJwtPayload, "iat" | "exp">,
  expiresIn: JwtExpiresIn = DEFAULT_EXPIRES_IN,
): string {
  const header = { alg: "HS256", typ: "JWT" } as const;
  const nowSeconds = Math.floor(Date.now() / 1000);
  const expSeconds = nowSeconds + parseExpiresInToSeconds(expiresIn);

  const fullPayload: AuthJwtPayload = {
    ...payload,
    iat: nowSeconds,
    exp: expSeconds,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;
  const signature = signHs256(unsignedToken, getJwtSecret());

  return `${unsignedToken}.${signature}`;
}

export function verifyAuthToken(token: string): AuthJwtPayload | null {
  try {
    const [encodedHeader, encodedPayload, encodedSignature] = token.split(".");
    if (!encodedHeader || !encodedPayload || !encodedSignature) return null;

    const unsignedToken = `${encodedHeader}.${encodedPayload}`;
    const expectedSignature = signHs256(unsignedToken, getJwtSecret());

    const actualSignatureBuffer = Buffer.from(encodedSignature);
    const expectedSignatureBuffer = Buffer.from(expectedSignature);
    if (
      actualSignatureBuffer.length !== expectedSignatureBuffer.length ||
      !timingSafeEqual(actualSignatureBuffer, expectedSignatureBuffer)
    ) {
      return null;
    }

    const decodedHeader = JSON.parse(base64UrlDecode(encodedHeader)) as {
      alg?: string;
      typ?: string;
    };
    if (decodedHeader.alg !== "HS256" || decodedHeader.typ !== "JWT") {
      return null;
    }

    const decodedPayload = JSON.parse(base64UrlDecode(encodedPayload)) as Partial<AuthJwtPayload>;

    if (
      typeof decodedPayload.sub !== "string" ||
      typeof decodedPayload.email !== "string" ||
      (decodedPayload.role !== "ADMIN" && decodedPayload.role !== "CUSTOMER")
    ) {
      return null;
    }

    if (
      typeof decodedPayload.exp === "number" &&
      decodedPayload.exp <= Math.floor(Date.now() / 1000)
    ) {
      return null;
    }

    return {
      sub: decodedPayload.sub,
      email: decodedPayload.email,
      role: decodedPayload.role,
      iat: typeof decodedPayload.iat === "number" ? decodedPayload.iat : undefined,
      exp: typeof decodedPayload.exp === "number" ? decodedPayload.exp : undefined,
    };
  } catch {
    return null;
  }
}
