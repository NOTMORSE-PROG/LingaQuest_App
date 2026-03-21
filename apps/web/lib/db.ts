import { PrismaClient } from "@prisma/client";

function createPrismaClient() {
  return new PrismaClient();
}

// Prevent multiple instances in development (hot reload)
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
