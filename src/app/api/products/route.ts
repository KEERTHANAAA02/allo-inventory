sed -i '' '1s/^/export const dynamic = "force-dynamic";\n/' src/app/api/products/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      include: {
        stockLevels: {
          include: { warehouse: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    const result = products.map((p) => ({
      ...p,
      stockLevels: p.stockLevels.map((sl) => ({
        ...sl,
        availableUnits: sl.totalUnits - sl.reservedUnits,
      })),
    }));

    return NextResponse.json(result);
  } catch (err) {
    console.error('Products error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
