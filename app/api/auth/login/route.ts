import { Role } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { signAuthToken } from "@/features/auth/jwt";
import { verifyPassword } from "@/lib/bcrypt";
import { setAuthCookie } from "@/lib/cookies";
import { badRequest, readJsonBody } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";

const loginSchema = z.object({
  email: z.email().toLowerCase(),
  password: z.string().min(8),
});

export async function POST(request: Request) {
  const rateLimited = checkRateLimit({
    request,
    scope: "auth:admin-login",
    max: 10,
    windowMs: 60_000,
  });
  if (rateLimited) return rateLimited;

  try {
    const body = await readJsonBody<unknown>(request);
    if (!body) {
      return badRequest("Invalid JSON payload.");
    }
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid login payload." },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: parsed.data.email },
      select: { id: true, email: true, password: true, role: true },
    });

    if (!user?.password) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 },
      );
    }

    if (user.role !== Role.ADMIN) {
      return NextResponse.json(
        { error: "Admin access required." },
        { status: 403 },
      );
    }

    const isValidPassword = await verifyPassword(
      parsed.data.password,
      user.password,
    );

    if (!isValidPassword) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 },
      );
    }

    const token = signAuthToken({
      sub: user.id,
      email: user.email,
      role: "ADMIN",
    });

    const response = NextResponse.json(
      { message: "Logged in successfully.", user: { id: user.id, role: "ADMIN" } },
      { status: 200 },
    );

    setAuthCookie(response, token);
    return response;
  } catch {
    return NextResponse.json(
      { error: "Something went wrong during login." },
      { status: 500 },
    );
  }
}
