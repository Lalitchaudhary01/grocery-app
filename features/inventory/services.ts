import { type TransactionClient } from "@/lib/prisma-types";

export interface InventoryOrderItemInput {
  productId: string;
  quantity: number;
}

export interface ReservedInventoryItem {
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  previousStock: number;
  newStock: number;
}

export class InventoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InventoryError";
  }
}

export class ProductNotFoundError extends InventoryError {
  missingProductIds: string[];

  constructor(missingProductIds: string[]) {
    super("Some products do not exist.");
    this.name = "ProductNotFoundError";
    this.missingProductIds = missingProductIds;
  }
}

export class InsufficientStockError extends InventoryError {
  productId: string;
  requested: number;
  available: number;

  constructor(productId: string, requested: number, available: number) {
    super("Insufficient stock for one or more products.");
    this.name = "InsufficientStockError";
    this.productId = productId;
    this.requested = requested;
    this.available = available;
  }
}

export class InvalidOrderItemError extends InventoryError {
  constructor() {
    super("Order contains invalid item quantity.");
    this.name = "InvalidOrderItemError";
  }
}

export function normalizeInventoryItems(
  items: InventoryOrderItemInput[],
): InventoryOrderItemInput[] {
  const map = new Map<string, number>();

  for (const item of items) {
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      throw new InvalidOrderItemError();
    }
    map.set(item.productId, (map.get(item.productId) ?? 0) + item.quantity);
  }

  return Array.from(map.entries()).map(([productId, quantity]) => {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new InvalidOrderItemError();
    }

    return {
      productId,
      quantity,
    };
  });
}

export async function reserveInventoryStock(
  tx: TransactionClient,
  items: InventoryOrderItemInput[],
): Promise<ReservedInventoryItem[]> {
  const normalizedItems = normalizeInventoryItems(items);
  const productIds = normalizedItems.map((item) => item.productId);

  const products = await tx.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true, price: true, stock: true },
  });

  type ProductRow = { id: string; name: string; price: number; stock: number };
  const productById = new Map<string, ProductRow>(
    (products as ProductRow[]).map((p) => [p.id, p]),
  );
  const missingProductIds = productIds.filter((id) => !productById.has(id));
  if (missingProductIds.length > 0) {
    throw new ProductNotFoundError(missingProductIds);
  }

  for (const item of normalizedItems) {
    const product = productById.get(item.productId);
    if (!product) {
      throw new ProductNotFoundError([item.productId]);
    }

    if (product.stock < item.quantity) {
      throw new InsufficientStockError(item.productId, item.quantity, product.stock);
    }
  }

  const reservedItems: ReservedInventoryItem[] = [];

  for (const item of normalizedItems) {
    const updateResult = await tx.product.updateMany({
      where: {
        id: item.productId,
        stock: { gte: item.quantity },
      },
      data: {
        stock: { decrement: item.quantity },
      },
    });

    if (updateResult.count !== 1) {
      const latestProduct = await tx.product.findUnique({
        where: { id: item.productId },
        select: { stock: true },
      });

      throw new InsufficientStockError(
        item.productId,
        item.quantity,
        latestProduct?.stock ?? 0,
      );
    }

    const product = productById.get(item.productId);
    if (!product) {
      throw new ProductNotFoundError([item.productId]);
    }

    reservedItems.push({
      productId: product.id,
      name: product.name,
      unitPrice: product.price,
      quantity: item.quantity,
      previousStock: product.stock,
      newStock: product.stock - item.quantity,
    });
  }

  return reservedItems;
}
