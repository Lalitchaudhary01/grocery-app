import { NextRequest, NextResponse } from "next/server";

import { verifyAuthToken } from "@/features/auth/jwt";
import { emailToMobile } from "@/lib/customer-auth";
import { CUSTOMER_AUTH_COOKIE_NAME } from "@/lib/cookies";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(CUSTOMER_AUTH_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const payload = verifyAuthToken(token);
  if (!payload || payload.role !== "CUSTOMER") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    return NextResponse.json(
      {
        user: {
          id: user.id,
          name: user.name,
          mobile: emailToMobile(user.email),
          email: emailToMobile(user.email) ? null : user.email,
        },
      },
      { status: 200 },
    );
  } catch {
    return NextResponse.json({ error: "Failed to load user." }, { status: 500 });
  }
}
