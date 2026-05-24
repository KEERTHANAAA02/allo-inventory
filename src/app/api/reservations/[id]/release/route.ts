// src/app/api/reservations/[id]/release/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const reservation = await tx.reservation.findUnique({ where: { id } });

      if (!reservation) throw new Error('NOT_FOUND');
      if (reservation.status === 'released') {
        // Idempotent
        return reservation;
      }
      if (reservation.status === 'confirmed') {
        throw new Error('ALREADY_CONFIRMED');
      }

      await tx.stockLevel.updateMany({
        where: { productId: reservation.productId, warehouseId: reservation.warehouseId },
        data: { reservedUnits: { decrement: reservation.quantity } },
      });

      return tx.reservation.update({
        where: { id },
        data: { status: 'released' },
        include: { product: true, warehouse: true },
      });
    });

    return NextResponse.json(updated);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '';
    if (msg === 'NOT_FOUND') return NextResponse.json({ error: 'Reservation not found' }, { status: 404 });
    if (msg === 'ALREADY_CONFIRMED') return NextResponse.json({ error: 'Cannot release a confirmed reservation' }, { status: 400 });
    console.error(err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
