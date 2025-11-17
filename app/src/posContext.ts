// src/posContext.ts

export type StoreRef = {
  id: number;
  name: string;
  code?: string;
  address?: string | null;
};

export type RegisterRef = {
  id: number;
  store_id: number;
  name: string;
  device_key?: string;
};

export type PosContext = {
  store: StoreRef;
  register: RegisterRef;
};

const KEY = "posContext";

export function getPosContext(): PosContext | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PosContext;
  } catch {
    return null;
  }
}

export function setPosContext(ctx: PosContext) {
  localStorage.setItem(KEY, JSON.stringify(ctx));
}

export function clearPosContext() {
  localStorage.removeItem(KEY);
}
