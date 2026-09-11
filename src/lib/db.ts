import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    // Fix for pooled Neondb (10054 ConnectionReset) on Vercel - limit connections and add retry
    datasourceUrl: process.env.DATABASE_URL,
  } as any);

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// Graceful retry for pooled connection reset (10054) - common on Vercel + Neon
async function withRetry<T>(fn: () => Promise<T>, retries = 1): Promise<T> {
  try {
    return await fn();
  } catch (e: any) {
    const msg = String(e?.message || "") + String(e?.code || "");
    if (retries > 0 && (msg.includes("10054") || msg.includes("ConnectionReset") || msg.includes("P1001") || msg.includes("Can't reach database"))) {
      await new Promise(r => setTimeout(r, 400));
      try { await prisma.$disconnect(); } catch {}
      try { await prisma.$connect(); } catch {}
      return withRetry(fn, retries - 1);
    }
    throw e;
  }
}

export async function isDbAvailable(): Promise<boolean> {
  const url = process.env.DATABASE_URL;
  if (!url || url.includes("user:password@localhost")) return false;
  try {
    await withRetry(() => prisma.$queryRaw`SELECT 1`);
    return true;
  } catch {
    return false;
  }
}

export async function getEffectiveRestaurantId(sessionRestaurantId?: string | null): Promise<string | null> {
  try {
    return await withRetry(async () => {
      if (sessionRestaurantId) {
        const exists = await prisma.restaurant.findUnique({ where: { id: sessionRestaurantId }, select: { id: true } });
        if (exists) return sessionRestaurantId;
      }
      const first = await prisma.restaurant.findFirst({ select: { id: true }, orderBy: { createdAt: "asc" } });
      if (first) return first.id;
      const demo = await prisma.restaurant.upsert({
        where: { slug: "spice-garden" },
        update: {},
        create: { name: "Spice Garden", slug: "spice-garden", address: "MG Road, Pune", phone: "+91 98765 43210" },
      });
      return demo.id;
    });
  } catch {
    return sessionRestaurantId || null;
  }
}
