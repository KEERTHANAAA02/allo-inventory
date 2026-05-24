'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';

interface Reservation {
  id: string;
  quantity: number;
  status: 'pending' | 'confirmed' | 'released';
  expiresAt: string;
  product: { name: string };
  warehouse: { name: string; location: string };
}

function useCountdown(expiresAt: string | null) {
  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  useEffect(() => {
    if (!expiresAt) return;
    const tick = () => {
      const diff = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
      setSecondsLeft(diff);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);
  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  return { secondsLeft, display: `${mins}:${secs.toString().padStart(2, '0')}` };
}

export default function CheckoutPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { secondsLeft, display } = useCountdown(reservation?.expiresAt ?? null);

  const fetchReservation = useCallback(async () => {
    try {
      const res = await fetch(`/api/reservations/${id}`);
      if (res.ok) {
        const data = await res.json();
        setReservation(data);
      } else {
        router.replace('/');
      }
    } catch {
      router.replace('/');
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => { fetchReservation(); }, [fetchReservation]);

  async function handleConfirm() {
    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/reservations/${id}/confirm`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to confirm');
        if (res.status === 410) setReservation((r) => r ? { ...r, status: 'released' } : r);
        return;
      }
      setReservation(data);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCancel() {
    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/reservations/${id}/release`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to cancel');
        return;
      }
      router.push('/');
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-zinc-600 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!reservation) return null;

  const isExpired = reservation.status === 'released' || (secondsLeft === 0 && reservation.status === 'pending');
  const isConfirmed = reservation.status === 'confirmed';
  const urgentCountdown = secondsLeft <= 60 && secondsLeft > 0 && reservation.status === 'pending';

  return (
    <div className="max-w-lg mx-auto">
      <button onClick={() => router.push('/')} className="text-zinc-400 hover:text-white text-sm mb-6 flex items-center gap-1 transition-colors">
        ← Back to products
      </button>
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-6">
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold mb-1">Checkout</p>
          <h1 className="text-2xl font-bold text-white">{reservation.product.name}</h1>
          <p className="text-zinc-400 text-sm mt-1">{reservation.warehouse.name} · {reservation.warehouse.location}</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-zinc-800/60 rounded-xl p-4">
            <p className="text-xs text-zinc-500 mb-1">Quantity</p>
            <p className="text-2xl font-bold text-white">{reservation.quantity}</p>
          </div>
          <div className="bg-zinc-800/60 rounded-xl p-4">
            <p className="text-xs text-zinc-500 mb-1">Status</p>
            <p className={`text-sm font-semibold capitalize ${isConfirmed ? 'text-emerald-400' : isExpired ? 'text-red-400' : 'text-amber-400'}`}>
              {reservation.status}
            </p>
          </div>
        </div>
        {!isConfirmed && !isExpired && (
          <div className={`rounded-xl p-5 text-center border ${urgentCountdown ? 'bg-red-950/40 border-red-700' : 'bg-zinc-800/60 border-zinc-700'}`}>
            <p className="text-xs text-zinc-500 mb-1">Time remaining to confirm</p>
            <p className={`text-5xl font-mono font-bold tabular-nums ${urgentCountdown ? 'text-red-400' : 'text-white'}`}>{display}</p>
            {urgentCountdown && <p className="text-red-400 text-xs mt-2 font-medium">Hurry! Reservation expiring soon.</p>}
          </div>
        )}
        {isExpired && (
          <div className="bg-red-950/40 border border-red-700 rounded-xl p-4 text-center">
            <p className="text-red-300 font-semibold">Reservation Expired</p>
            <p className="text-red-400 text-sm mt-1">Go back to reserve again.</p>
          </div>
        )}
        {isConfirmed && (
          <div className="bg-emerald-950/40 border border-emerald-700 rounded-xl p-4 text-center">
            <p className="text-emerald-300 font-semibold text-lg">🎉 Purchase Confirmed!</p>
            <p className="text-emerald-400 text-sm mt-1">Your order has been placed successfully.</p>
          </div>
        )}
        {error && (
          <div className="bg-red-900/40 border border-red-700 rounded-lg px-4 py-3 text-red-300 text-sm">{error}</div>
        )}
        {!isConfirmed && !isExpired && (
          <div className="flex gap-3">
            <button onClick={handleCancel} disabled={actionLoading} className="flex-1 px-4 py-3 rounded-xl border border-zinc-700 text-zinc-300 hover:bg-zinc-800 disabled:opacity-50 font-medium transition-colors text-sm">
              Cancel
            </button>
            <button onClick={handleConfirm} disabled={actionLoading} className="flex-1 px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold transition-colors text-sm">
              {actionLoading ? 'Processing…' : 'Confirm Purchase'}
            </button>
          </div>
        )}
        {(isConfirmed || isExpired) && (
          <button onClick={() => router.push('/')} className="w-full px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-colors text-sm">
            Back to Products
          </button>
        )}
      </div>
    </div>
  );
}
