// src/app/api/reservations/expire/route.ts
// This route can be called by a Vercel Cron job (set crons in vercel.json)
// or hit manually. It releases all pending reservations past their expiresAt.
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const expired = await prisma.reservation.findMany({
      where: {
        status: 'pending',
        expiresAt: { lt: new Date() },
      },
    });

    let released = 0;
    for (const r of expired) {
      await prisma.$transaction(async (tx) => {
        await tx.reservation.update({ where: { id: r.id }, data: { status: 'released' } });
        await tx.stockLevel.updateMany({
          where: { productId: r.productId, warehouseId: r.warehouseId },
          data: { reservedUnits: { decrement: r.quantity } },
        });
      });
      released++;
    }

    return NextResponse.json({ released });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
