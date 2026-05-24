'use client';
// src/app/page.tsx
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface StockLevel {
  warehouseId: string;
  warehouse: { id: string; name: string; location: string };
  totalUnits: number;
  reservedUnits: number;
  availableUnits: number;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  stockLevels: StockLevel[];
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [reserving, setReserving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const loadProducts = () =>
    fetch('/api/products')
      .then((r) => r.json())
      .then(setProducts)
      .finally(() => setLoading(false));

  useEffect(() => {
    loadProducts();
  }, []);

  async function handleReserve(productId: string, warehouseId: string) {
    setReserving(`${productId}-${warehouseId}`);
    setError(null);
    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, warehouseId, quantity: 1 }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          setError('Not enough stock — someone else just grabbed the last unit!');
        } else {
          setError(data.error || 'Failed to reserve');
        }
        return;
      }
      // Store in localStorage so checkout page can read it
      localStorage.setItem(`reservation-${data.id}`, JSON.stringify(data));
      router.push(`/checkout/${data.id}`);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setReserving(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-zinc-600 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-1">Products</h1>
        <p className="text-zinc-400">Reserve items to hold your stock for 10 minutes during checkout.</p>
      </div>

      {error && (
        <div className="mb-6 px-4 py-3 bg-red-900/40 border border-red-700 rounded-lg text-red-300 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-200 ml-4">✕</button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {products.map((product) => (
          <div key={product.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
            {product.imageUrl && (
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-full h-48 object-cover"
              />
            )}
            <div className="p-5">
              <h2 className="text-lg font-semibold text-white mb-1">{product.name}</h2>
              {product.description && (
                <p className="text-zinc-400 text-sm mb-4">{product.description}</p>
              )}
              <div className="space-y-3">
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">
                  Stock by Warehouse
                </p>
                {product.stockLevels.map((sl) => (
                  <div
                    key={sl.warehouseId}
                    className="flex items-center justify-between bg-zinc-800/60 rounded-xl px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-white">{sl.warehouse.name}</p>
                      <p className="text-xs text-zinc-400">{sl.warehouse.location}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`text-sm font-mono font-bold ${
                          sl.availableUnits > 5
                            ? 'text-emerald-400'
                            : sl.availableUnits > 0
                            ? 'text-amber-400'
                            : 'text-red-400'
                        }`}
                      >
                        {sl.availableUnits} avail
                      </span>
                      <button
                        onClick={() => handleReserve(product.id, sl.warehouseId)}
                        disabled={sl.availableUnits === 0 || reserving === `${product.id}-${sl.warehouseId}`}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-700 disabled:text-zinc-500 disabled:cursor-not-allowed text-white transition-colors"
                      >
                        {reserving === `${product.id}-${sl.warehouseId}`
                          ? 'Reserving…'
                          : sl.availableUnits === 0
                          ? 'Out of Stock'
                          : 'Reserve'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
