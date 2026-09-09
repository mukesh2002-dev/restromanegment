// In-memory KOT store for demo fallback when DATABASE_URL not configured.
// Persists within server process via globalThis.

import { demoKOTs } from "@/data/demo";

type KOTItem = { id: string; name: string; menuItemId: string; quantity: number; notes: string; status: string };
type KOT = (typeof demoKOTs)[number] & { items: KOTItem[] };

const globalStore = globalThis as unknown as { __kotStore?: Map<string, KOT> };

function getStore(): Map<string, KOT> {
  if (!globalStore.__kotStore) {
    const m = new Map<string, KOT>();
    for (const k of demoKOTs as unknown as KOT[]) m.set(k.id, structuredClone(k));
    globalStore.__kotStore = m;
  }
  return globalStore.__kotStore!;
}

export function listKOTs() { return Array.from(getStore().values()).sort((a,b)=> new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); }
export function getKOT(id: string) { return getStore().get(id) || null; }
export function setKOT(id: string, patch: Partial<KOT>) {
  const store = getStore();
  const cur = store.get(id);
  if (!cur) return null;
  const next = { ...cur, ...patch, updatedAt: new Date().toISOString() } as KOT;
  store.set(id, next);
  return next;
}
export function updateKOTItem(kotId: string, itemId: string, patch: Partial<KOTItem>) {
  const kot = getStore().get(kotId);
  if (!kot) return null;
  const items = kot.items.map(it=> it.id===itemId ? { ...it, ...patch } : it);
  const next = { ...kot, items, updatedAt: new Date().toISOString() } as KOT;
  getStore().set(kotId, next);
  return next;
}
export function addKOT(kot: KOT) { getStore().set(kot.id, kot); return kot; }
