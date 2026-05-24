// src/app/api/reservations/[id]/confirm/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  // Idempotency support
  const idempotencyKey = req.headers.get('Idempotency-Key');

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const reservation = await tx.reservation.findUnique({ where: { id } });

      if (!reservation) {
        throw new Error('NOT_FOUND');
      }
      if (reservation.status === 'confirmed') {
        // Already confirmed - idempotent success
        return reservation;
      }
      if (reservation.status === 'released') {
        throw new Error('ALREADY_RELEASED');
      }
      if (reservation.expiresAt < new Date()) {
        // Lazy cleanup on read
        await tx.reservation.update({ where: { id }, data: { status: 'released' } });
        await tx.stockLevel.updateMany({
          where: { productId: reservation.productId, warehouseId: reservation.warehouseId },
          data: { reservedUnits: { decrement: reservation.quantity } },
        });
        throw new Error('EXPIRED');
      }

      // Confirm: decrement total & reserved
      await tx.stockLevel.updateMany({
        where: { productId: reservation.productId, warehouseId: reservation.warehouseId },
        data: {
          totalUnits: { decrement: reservation.quantity },
          reservedUnits: { decrement: reservation.quantity },
        },
      });

      return tx.reservation.update({
        where: { id },
        data: { status: 'confirmed' },
        include: { product: true, warehouse: true },
      });
    });

    return NextResponse.json(updated);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '';
    if (msg === 'NOT_FOUND') return NextResponse.json({ error: 'Reservation not found' }, { status: 404 });
    if (msg === 'EXPIRED') return NextResponse.json({ error: 'Reservation has expired' }, { status: 410 });
    if (msg === 'ALREADY_RELEASED') return NextResponse.json({ error: 'Reservation was already released' }, { status: 410 });
    console.error(err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
