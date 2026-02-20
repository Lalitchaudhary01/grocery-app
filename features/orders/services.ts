import { prisma } from "@/lib/prisma";
import {
  reserveInventoryStock,
  type InventoryOrderItemInput,
  type ReservedInventoryItem,
} from "@/features/inventory/services";

export interface CreateOrderInput {
  customer: {
    email: string;
    name?: string;
  };
  items: InventoryOrderItemInput[];
}

export interface CreatedOrderResult {
  order: {
    id: string;
    status: string;
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

export async function createOrder(input: CreateOrderInput): Promise<CreatedOrderResult> {
  return prisma.$transaction(async (tx) => {
    const customer = await tx.user.upsert({
      where: { email: input.customer.email },
      create: {
        email: input.customer.email,
        name: input.customer.name,
      },
      update: input.customer.name
        ? {
            name: input.customer.name,
          }
        : {},
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    const reservedItems = await reserveInventoryStock(tx, input.items);
    const totalAmount = calculateTotalAmount(reservedItems);

    const order = await tx.order.create({
      data: {
        userId: customer.id,
        total: totalAmount,
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

    return {
      order: {
        id: order.id,
        status: order.status,
        totalAmount,
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
