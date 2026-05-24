// src/app/layout.tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Allo Inventory',
  description: 'Inventory & Reservation Platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-zinc-950 text-zinc-100 font-sans antialiased">
        <nav className="border-b border-zinc-800 px-6 py-4 flex items-center gap-3">
          <span className="text-lg font-bold tracking-tight text-white">Allo</span>
          <span className="text-zinc-500 text-sm">Inventory Platform</span>
        </nav>
        <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
