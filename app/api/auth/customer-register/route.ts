import { Role } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { mobileToEmail, normalizeMobile } from "@/lib/customer-auth";
import { badRequest, readJsonBody } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const customerRegisterSchema = z.object({
  name: z.string().trim().min(2).max(100),
  mobile: z.string().trim().min(10).max(20),
});

export async function POST(request: Request) {
  try {
    const body = await readJsonBody<unknown>(request);
    if (!body) return badRequest("Invalid JSON payload.");

    const parsed = customerRegisterSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid registration payload." }, { status: 400 });
    }

    const normalizedMobile = normalizeMobile(parsed.data.mobile);
    if (!normalizedMobile) {
      return NextResponse.json({ error: "Invalid mobile number." }, { status: 400 });
    }

    const email = mobileToEmail(normalizedMobile);

    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Mobile already registered. Please login." },
        { status: 409 },
      );
    }

    const user = await prisma.user.create({
      data: {
        name: parsed.data.name,
        email,
        role: Role.USER,
      },
      select: {
        id: true,
        name: true,
      },
    });

    return NextResponse.json(
      {
        message: "Registration successful. Please login.",
        user: {
          id: user.id,
          name: user.name,
          mobile: normalizedMobile,
        },
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json({ error: "Registration failed." }, { status: 500 });
  }
}
