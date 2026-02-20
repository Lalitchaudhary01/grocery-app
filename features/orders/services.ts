import { prisma } from "@/lib/prisma";
import {
  reserveInventoryStock,
  type InventoryOrderItemInput,
  type ReservedInventoryItem,
} from "@/features/inventory/services";

export interface CreateOrderInput {
  userId: string;
  deliveryAddress: {
    street: string;
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
    const totalAmount = calculateTotalAmount(reservedItems);

    const savedAddress = await tx.address.create({
      data: {
        userId: customer.id,
        street: input.deliveryAddress.street,
        city: input.deliveryAddress.city,
        state: input.deliveryAddress.state,
        postalCode: input.deliveryAddress.postalCode,
        country: input.deliveryAddress.country,
      },
      select: {
        id: true,
      },
    });

    const order = await tx.order.create({
      data: {
        userId: customer.id,
        addressId: savedAddress.id,
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
