import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export async function isDbAvailable(): Promise<boolean> {
  const url = process.env.DATABASE_URL;
  if (!url || url.includes("user:password@localhost")) return false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

export async function getEffectiveRestaurantId(sessionRestaurantId?: string | null): Promise<string | null> {
  try {
    if (sessionRestaurantId) {
      const exists = await prisma.restaurant.findUnique({ where: { id: sessionRestaurantId }, select: { id: true } });
      if (exists) return sessionRestaurantId;
    }
    const first = await prisma.restaurant.findFirst({ select: { id: true }, orderBy: { createdAt: "asc" } });
    if (first) return first.id;
    // fallback: ensure demo restaurant exists
    const demo = await prisma.restaurant.upsert({
      where: { slug: "spice-garden" },
      update: {},
      create: { name: "Spice Garden", slug: "spice-garden", address: "MG Road, Pune", phone: "+91 98765 43210" },
    });
    return demo.id;
  } catch {
    return sessionRestaurantId || null;
  }
}
