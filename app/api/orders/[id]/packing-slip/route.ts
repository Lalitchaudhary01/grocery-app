import { NextRequest, NextResponse } from "next/server";

import { verifyAuthToken } from "@/features/auth/jwt";
import { AUTH_COOKIE_NAME } from "@/lib/cookies";
import { parseOrderPaymentMeta } from "@/lib/order-payment-meta";
import { prisma } from "@/lib/prisma";

type PackingSlipItem = {
  quantity: number;
  price: number;
  product: {
    name: string;
  };
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function ensureAdmin(request: NextRequest): NextResponse | null {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const payload = verifyAuthToken(token);
  if (!payload || payload.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  return null;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const authError = ensureAdmin(request);
  if (authError) return authError;

  const { id } = await context.params;
  try {
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        user: { select: { name: true, email: true } },
        address: true,
        items: {
          include: {
            product: { select: { name: true } },
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    const price = parseOrderPaymentMeta(order.paymentNote);
    const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>Packing Slip ${escapeHtml(order.id)}</title>
<style>body{font-family:Arial,sans-serif;padding:18px;color:#111}h1{font-size:20px;margin:0 0 8px}.meta{margin:0 0 14px;font-size:13px;color:#555}.box{border:1px solid #ddd;border-radius:8px;padding:10px;margin-bottom:10px}table{width:100%;border-collapse:collapse}th,td{border-bottom:1px solid #eee;padding:8px;text-align:left;font-size:13px}th{background:#f7f7f7}tfoot td{font-weight:700}</style>
</head><body>
<h1>Vivek Chaudhary Mohanpur Wale - Packing Slip</h1>
<p class="meta">Order: #${escapeHtml(order.id.slice(0, 8).toUpperCase())} | Date: ${new Date(order.createdAt).toLocaleString("en-IN")}</p>
<div class="box">
<p><strong>Customer:</strong> ${escapeHtml(order.user.name || order.user.email)}</p>
<p><strong>Phone:</strong> ${escapeHtml(order.address?.phone || "N/A")}</p>
<p><strong>Address:</strong> ${escapeHtml(
      order.address
        ? `${order.address.street}, ${order.address.city}, ${order.address.state}, ${order.address.postalCode}, ${order.address.country}`
        : "N/A",
    )}</p>
</div>
<table><thead><tr><th>Product</th><th>Qty</th><th>Unit Price</th><th>Line Total</th></tr></thead>
<tbody>
${order.items
  .map(
    (item: PackingSlipItem) =>
      `<tr><td>${escapeHtml(item.product.name)}</td><td>${item.quantity}</td><td>₹${item.price.toFixed(
        2,
      )}</td><td>₹${(item.price * item.quantity).toFixed(2)}</td></tr>`,
  )
  .join("")}
</tbody>
<tfoot>
<tr><td colspan="3">Subtotal</td><td>₹${(price?.subtotalAmount ?? order.total).toFixed(2)}</td></tr>
<tr><td colspan="3">Delivery</td><td>₹${(price?.deliveryCharge ?? 0).toFixed(2)}</td></tr>
<tr><td colspan="3">Total</td><td>₹${order.total.toFixed(2)}</td></tr>
</tfoot>
</table>
<script>window.onload=function(){window.print();}</script>
</body></html>`;

    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  } catch (error) {
    const message =
      process.env.NODE_ENV === "development" && error instanceof Error
        ? error.message
        : "Failed to generate packing slip.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const runtime = "nodejs";
