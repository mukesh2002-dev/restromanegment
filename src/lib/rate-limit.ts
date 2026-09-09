// Simple in-memory rate limiter for reward QR claims + auth
// Keyed by IP+BillId, sliding window. For production replace with Redis.

const WINDOW_MS = 60_000; // 1 min
const MAX_HITS = 10; // per window per IP
const BILL_COOLDOWN_MS = 5_000; // per bill duplicate burst protection

type Entry = { count: number; start: number };
const ipMap = new Map<string, Entry>();
const billMap = new Map<string, number>();
const loginMap = new Map<string, Entry>();

export function checkLoginRateLimit(ip: string): { ok: boolean; retryAfter?: number } {
  const now=Date.now();
  const WINDOW=15*60_000; // 15 min
  const MAX=5;
  let e=loginMap.get(ip);
  if(!e || now - e.start > WINDOW){ e={ count:1, start: now }; loginMap.set(ip,e); return { ok:true }; }
  e.count++;
  if(e.count > MAX) return { ok:false, retryAfter: Math.ceil((WINDOW - (now - e.start))/1000) };
  return { ok:true };
}

export function checkRateLimit(ip: string, billId: string): { ok: boolean; code?: string; retryAfter?: number } {
  const now = Date.now();
  // per-bill cooldown (prevent 4 rapid scans)
  const last = billMap.get(billId);
  if (last && now - last < BILL_COOLDOWN_MS) {
    return { ok: false, code: "RATE_LIMITED", retryAfter: Math.ceil((BILL_COOLDOWN_MS - (now - last))/1000) };
  }
  // per-IP window
  const key = ip;
  let e = ipMap.get(key);
  if (!e || now - e.start > WINDOW_MS) {
    e = { count: 1, start: now };
    ipMap.set(key, e);
  } else {
    e.count++;
    if (e.count > MAX_HITS) return { ok: false, code: "RATE_LIMITED", retryAfter: Math.ceil((WINDOW_MS - (now - e.start))/1000) };
  }
  billMap.set(billId, now);
  // cleanup
  if (ipMap.size > 5000) {
    for (const [k,v] of ipMap) if (now - v.start > WINDOW_MS) ipMap.delete(k);
  }
  return { ok: true };
}
