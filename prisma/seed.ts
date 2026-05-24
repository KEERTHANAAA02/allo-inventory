// prisma/seed.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Clean up
  await prisma.reservation.deleteMany();
  await prisma.stockLevel.deleteMany();
  await prisma.product.deleteMany();
  await prisma.warehouse.deleteMany();

  // Create warehouses
  const mumbai = await prisma.warehouse.create({
    data: { name: 'Mumbai Central', location: 'Mumbai, MH' },
  });
  const delhi = await prisma.warehouse.create({
    data: { name: 'Delhi North', location: 'Delhi, DL' },
  });
  const bangalore = await prisma.warehouse.create({
    data: { name: 'Bangalore Hub', location: 'Bangalore, KA' },
  });

  // Create products
  const products = await Promise.all([
    prisma.product.create({
      data: {
        name: 'Wireless Noise-Cancelling Headphones',
        description: 'Premium audio experience with 30hr battery life',
        imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400',
      },
    }),
    prisma.product.create({
      data: {
        name: 'Mechanical Keyboard',
        description: 'TKL layout with Cherry MX switches',
        imageUrl: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=400',
      },
    }),
    prisma.product.create({
      data: {
        name: 'USB-C Hub 7-in-1',
        description: 'Connect everything with one hub',
        imageUrl: 'https://images.unsplash.com/photo-1625842268584-8f3296236761?w=400',
      },
    }),
    prisma.product.create({
      data: {
        name: 'Ergonomic Mouse',
        description: 'Reduce wrist strain with vertical design',
        imageUrl: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400',
      },
    }),
  ]);

  // Create stock levels
  const warehouses = [mumbai, delhi, bangalore];
  for (const product of products) {
    for (const warehouse of warehouses) {
      await prisma.stockLevel.create({
        data: {
          productId: product.id,
          warehouseId: warehouse.id,
          totalUnits: Math.floor(Math.random() * 20) + 2,
          reservedUnits: 0,
        },
      });
    }
  }

  console.log('✅ Seed complete');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
