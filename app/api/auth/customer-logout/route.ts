import { NextResponse } from "next/server";

import { clearCustomerAuthCookie } from "@/lib/cookies";

export async function POST() {
  const response = NextResponse.json({ message: "Logged out." }, { status: 200 });
  clearCustomerAuthCookie(response);
  return response;
}
