import { Role } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { signAuthToken } from "@/features/auth/jwt";
import { hashPassword } from "@/lib/bcrypt";
import { setAuthCookie } from "@/lib/cookies";
import { getRequiredEnv } from "@/lib/env";
import { badRequest, readJsonBody } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const registerSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  email: z.email().toLowerCase(),
  password: z.string().min(8).max(128),
  seedKey: z.string().min(1),
});

function getRequiredSeedKey(): string {
  return getRequiredEnv("ADMIN_SEED_KEY");
}

export async function POST(request: Request) {
  try {
    const body = await readJsonBody<unknown>(request);
    if (!body) {
      return badRequest("Invalid JSON payload.");
    }
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid registration payload." },
        { status: 400 },
      );
    }

    const expectedSeedKey = getRequiredSeedKey();
    if (parsed.data.seedKey !== expectedSeedKey) {
      return NextResponse.json(
        { error: "Registration is restricted." },
        { status: 403 },
      );
    }

    const adminCount = await prisma.user.count({
      where: { role: Role.ADMIN },
    });

    if (adminCount > 0) {
      return NextResponse.json(
        { error: "Public registration is disabled." },
        { status: 403 },
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: parsed.data.email },
      select: { id: true },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Email already in use." },
        { status: 409 },
      );
    }

    const hashedPassword = await hashPassword(parsed.data.password);

    const createdAdmin = await prisma.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        password: hashedPassword,
        role: Role.ADMIN,
      },
      select: { id: true, email: true, role: true },
    });

    const token = signAuthToken({
      sub: createdAdmin.id,
      email: createdAdmin.email,
      role: "ADMIN",
    });

    const response = NextResponse.json(
      {
        message: "Initial admin account created.",
        user: { id: createdAdmin.id, role: "ADMIN" },
      },
      { status: 201 },
    );

    setAuthCookie(response, token);
    return response;
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("Missing ADMIN_SEED_KEY")
    ) {
      return NextResponse.json(
        { error: "Server is not configured for admin seed registration." },
        { status: 503 },
      );
    }

    return NextResponse.json(
      { error: "Something went wrong during registration." },
      { status: 500 },
    );
  }
}
