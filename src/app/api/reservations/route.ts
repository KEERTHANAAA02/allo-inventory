// src/app/api/reservations/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const ReserveSchema = z.object({
  productId: z.string().min(1),
  warehouseId: z.string().min(1),
  quantity: z.number().int().positive(),
});

const RESERVATION_TTL_MINUTES = 10;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = ReserveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 });
    }

    const { productId, warehouseId, quantity } = parsed.data;

    // Idempotency support
    const idempotencyKey = req.headers.get('Idempotency-Key');
    if (idempotencyKey) {
      const existing = await prisma.reservation.findUnique({
        where: { idempotencyKey },
        include: { product: true, warehouse: true },
      });
      if (existing) {
        return NextResponse.json(existing, { status: 200 });
      }
    }

    // Atomic SQL update: only decrements if enough stock is available.
    // This is race-condition safe because the WHERE check and UPDATE happen
    // atomically in a single SQL statement.
    const result = await prisma.$executeRaw`
      UPDATE "StockLevel"
      SET "reservedUnits" = "reservedUnits" + ${quantity},
          "updatedAt" = NOW()
      WHERE "productId" = ${productId}
        AND "warehouseId" = ${warehouseId}
        AND ("totalUnits" - "reservedUnits") >= ${quantity}
    `;

    if (result === 0) {
      const stock = await prisma.stockLevel.findUnique({
        where: { productId_warehouseId: { productId, warehouseId } },
      });
      if (!stock) {
        return NextResponse.json({ error: 'Product/warehouse not found' }, { status: 404 });
      }
      return NextResponse.json({ error: 'Not enough stock available' }, { status: 409 });
    }

    const expiresAt = new Date(Date.now() + RESERVATION_TTL_MINUTES * 60 * 1000);
    const reservation = await prisma.reservation.create({
      data: {
        productId,
        warehouseId,
        quantity,
        status: 'pending',
        expiresAt,
        ...(idempotencyKey ? { idempotencyKey } : {}),
      },
      include: { product: true, warehouse: true },
    });

    return NextResponse.json(reservation, { status: 201 });
  } catch (err: unknown) {
    console.error('Reserve error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}