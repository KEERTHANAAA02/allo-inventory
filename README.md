deployed link
https://6a130cac945106d75a611607--lovely-sorbet-5c7f23.netlify.app


# Allo Inventory — Take-Home Exercise

A Next.js inventory and reservation platform with race-condition-safe stock reservation.

## How to Run Locally

### 1. Prerequisites
- Node.js 18+
- A hosted PostgreSQL instance (Supabase, Neon, or Railway — all have free tiers)

### 2. Clone & Install
```bash
git clone <your-repo>
cd allo-inventory
npm install
```

### 3. Configure Environment
```bash
cp .env.example .env.local
# Edit .env.local and add your DATABASE_URL
```

### 4. Run Migrations & Seed
```bash
npm run db:generate   # Generate Prisma client
npm run db:push       # Push schema to DB (creates tables)
npm run db:seed       # Seed with sample products & warehouses
```

### 5. Start Dev Server
```bash
npm run dev
# Visit http://localhost:3000
```

---

## Architecture

### Data Model
- **Product** — a sellable item
- **Warehouse** — a fulfillment location
- **StockLevel** — `totalUnits` and `reservedUnits` per product/warehouse pair
- **Reservation** — links product + warehouse + quantity with a `status` (pending → confirmed | released) and `expiresAt`

### Concurrency Safety (Core of the Exercise)

The reservation endpoint uses a **PostgreSQL `SELECT FOR UPDATE`** advisory lock inside a Prisma transaction. When two simultaneous requests arrive for the last unit of a SKU:

1. Both enter `prisma.$transaction()`
2. The `FOR UPDATE` clause means the second request **blocks** until the first commits or rolls back
3. The first request sees `availableUnits = 1`, reserves it, commits — `reservedUnits` is now incremented
4. The second request unblocks, sees `availableUnits = 0`, and returns **409 Conflict**

This guarantees exactly one succeeds — no application-level locks, no optimistic retry loops needed.

### Expiry Mechanism

Three-layer approach:
1. **Vercel Cron** (`vercel.json`) calls `GET /api/reservations/expire` every minute — batch-releases all expired pending reservations and decrements `reservedUnits`
2. **Lazy cleanup on confirm** — if `POST /api/reservations/:id/confirm` is called on an expired reservation, it cleans up inline and returns 410
3. **UI countdown** — the checkout page counts down locally; when it hits 0, the UI shows "Expired" without needing a server round-trip

### Idempotency (Bonus)

Pass an `Idempotency-Key` header with `POST /api/reservations` or `POST /api/reservations/:id/confirm`. The server stores the key in a `@unique` column. On retry, it returns the original response without re-executing the side effect.

---

## Trade-offs & What I'd Do Differently

| Trade-off | Decision | With More Time |
|-----------|----------|----------------|
| `SELECT FOR UPDATE` vs Redis | Postgres row lock — simpler, no extra infra | Redis distributed lock for cross-region deployments |
| No GET /reservations/:id | Checkout page uses localStorage to pass data | Add a proper GET endpoint |
| Quantity hardcoded to 1 in UI | Keeps the demo simple | Add quantity selector |
| No auth | Out of scope | Link reservations to user sessions/JWTs |
| Cron every 1 min | Simplest production approach | Trigger cleanup reactively via Postgres `pg_notify` |
