// src/types/index.ts
export type ReservationStatus = 'pending' | 'confirmed' | 'released';

export interface ProductWithStock {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  stockLevels: {
    warehouseId: string;
    warehouse: { id: string; name: string; location: string };
    totalUnits: number;
    reservedUnits: number;
    availableUnits: number;
  }[];
}

export interface ReservationResponse {
  id: string;
  productId: string;
  warehouseId: string;
  quantity: number;
  status: ReservationStatus;
  expiresAt: string;
  product: { name: string };
  warehouse: { name: string; location: string };
}
