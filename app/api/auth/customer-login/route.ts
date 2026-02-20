import { Role } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { signAuthToken } from "@/features/auth/jwt";
import { mobileToEmail, normalizeMobile } from "@/lib/customer-auth";
import { setCustomerAuthCookie } from "@/lib/cookies";
import { badRequest, readJsonBody } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";

const customerLoginSchema = z.object({
  mobile: z.string().trim().min(10).max(20),
});

export async function POST(request: Request) {
  const rateLimited = checkRateLimit({
    request,
    scope: "auth:customer-login",
    max: 12,
    windowMs: 60_000,
  });
  if (rateLimited) return rateLimited;

  try {
    const body = await readJsonBody<unknown>(request);
    if (!body) return badRequest("Invalid JSON payload.");

    const parsed = customerLoginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid login payload." }, { status: 400 });
    }

    const normalizedMobile = normalizeMobile(parsed.data.mobile);
    if (!normalizedMobile) {
      return NextResponse.json({ error: "Invalid mobile number." }, { status: 400 });
    }

    const email = mobileToEmail(normalizedMobile);

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        role: true,
        name: true,
      },
    });
    if (!user || user.role !== Role.USER) {
      return NextResponse.json(
        { error: "User not registered. Please register first." },
        { status: 404 },
      );
    }

    const token = signAuthToken({
      sub: user.id,
      email: user.email,
      role: "CUSTOMER",
    });

    const response = NextResponse.json(
      {
        message: "Customer login successful.",
        user: {
          id: user.id,
          name: user.name,
          mobile: normalizedMobile,
        },
      },
      { status: 200 },
    );

    setCustomerAuthCookie(response, token);
    return response;
  } catch {
    return NextResponse.json({ error: "Customer login failed." }, { status: 500 });
  }
}
