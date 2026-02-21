import { type Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { type OrderStatus } from "@/lib/order-enums";
import {
  reserveInventoryStock,
  type InventoryOrderItemInput,
  type ReservedInventoryItem,
} from "@/features/inventory/services";
import { calculateOrderPriceBreakdown } from "@/lib/order-pricing";

export interface CreateOrderInput {
  userId: string;
  deliveryAddress: {
    street: string;
    phone: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  items: InventoryOrderItemInput[];
}

export interface CreatedOrderResult {
  order: {
    id: string;
    status: OrderStatus;
    subtotalAmount: number;
    deliveryCharge: number;
    totalAmount: number;
    createdAt: Date;
    customer: {
      id: string;
      email: string;
      name: string | null;
    };
    items: Array<{
      productId: string;
      name: string;
      quantity: number;
      unitPrice: number;
      lineTotal: number;
    }>;
  };
}

function calculateTotalAmount(items: ReservedInventoryItem[]): number {
  return items.reduce((total, item) => total + item.unitPrice * item.quantity, 0);
}

function hasUnknownPaymentStatusField(error: unknown): boolean {
  return error instanceof Error && error.message.includes("paymentStatus");
}

export async function createOrder(input: CreateOrderInput): Promise<CreatedOrderResult> {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const customer = await tx.user.findUnique({
      where: { id: input.userId },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });
    if (!customer) {
      throw new Error("Customer not found.");
    }

    const reservedItems = await reserveInventoryStock(tx, input.items);
    const subtotalAmount = calculateTotalAmount(reservedItems);
    const priceBreakdown = calculateOrderPriceBreakdown(subtotalAmount);

    let hasPendingPaymentOrder = false;
    try {
      const existingPendingPaymentOrder = await tx.order.findFirst({
        where: {
          userId: customer.id,
          paymentStatus: "PENDING_VERIFICATION",
          status: {
            notIn: ["CANCELLED", "DELIVERED"],
          },
        },
        select: { id: true },
      });
      hasPendingPaymentOrder = Boolean(existingPendingPaymentOrder);
    } catch (error) {
      if (!hasUnknownPaymentStatusField(error)) {
        throw error;
      }
    }

    if (hasPendingPaymentOrder) {
      throw new Error("Please wait. Your previous payment is still being verified.");
    }

    const savedAddress = await tx.address.create({
      data: {
        userId: customer.id,
        street: input.deliveryAddress.street,
        phone: input.deliveryAddress.phone,
        city: input.deliveryAddress.city,
        state: input.deliveryAddress.state,
        postalCode: input.deliveryAddress.postalCode,
        country: input.deliveryAddress.country,
      },
      select: {
        id: true,
      },
    });

    let order: {
      id: string;
      status: OrderStatus;
      createdAt: Date;
    };

    try {
      order = await tx.order.create({
        data: {
          userId: customer.id,
          addressId: savedAddress.id,
          paymentStatus: "PENDING_VERIFICATION",
          paymentMethod: "UPI_QR",
          paymentNote: JSON.stringify({
            type: "UPI_QR_PENDING",
            message: "Customer marked payment done via QR. Admin verification pending.",
            subtotalAmount: priceBreakdown.subtotal,
            deliveryCharge: priceBreakdown.deliveryCharge,
            finalAmount: priceBreakdown.total,
          }),
          total: priceBreakdown.total,
          items: {
            createMany: {
              data: reservedItems.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
                price: item.unitPrice,
              })),
            },
          },
        },
        select: {
          id: true,
          status: true,
          createdAt: true,
        },
      });
    } catch (error) {
      if (!hasUnknownPaymentStatusField(error)) {
        throw error;
      }

      order = await tx.order.create({
        data: {
          userId: customer.id,
          addressId: savedAddress.id,
          total: priceBreakdown.total,
          items: {
            createMany: {
              data: reservedItems.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
                price: item.unitPrice,
              })),
            },
          },
        },
        select: {
          id: true,
          status: true,
          createdAt: true,
        },
      });
    }

    await tx.orderStatusHistory.create({
      data: {
        orderId: order.id,
        status: order.status,
        note: "Order placed by customer.",
        changedByUserId: customer.id,
      },
    });

    await tx.stockChangeHistory.createMany({
      data: reservedItems.map((item) => ({
        productId: item.productId,
        orderId: order.id,
        changeType: "ORDER_PLACED",
        quantityDelta: -item.quantity,
        previousStock: item.previousStock,
        newStock: item.newStock,
        reason: "Stock reduced after order placement.",
        changedByUserId: customer.id,
      })),
    });

    return {
      order: {
        id: order.id,
        status: order.status,
        subtotalAmount: priceBreakdown.subtotal,
        deliveryCharge: priceBreakdown.deliveryCharge,
        totalAmount: priceBreakdown.total,
        createdAt: order.createdAt,
        customer,
        items: reservedItems.map((item) => ({
          productId: item.productId,
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal: item.unitPrice * item.quantity,
        })),
      },
    };
  });
}
