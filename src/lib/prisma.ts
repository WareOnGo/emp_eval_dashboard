import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

// Prisma 7 requires a driver adapter; `@prisma/adapter-pg` talks to Postgres
// directly with no query engine binary, which is what Vercel wants.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createClient() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is not set — copy .env.example to .env and fill it in.");
  }

  // The Supabase pooler on :5432 is session mode (35 clients total), and Next
  // builds/renders across several workers — so keep each process's pool small.
  const max = Number(process.env.DATABASE_POOL_MAX ?? 4);

  return new PrismaClient({
    adapter: new PrismaPg({ connectionString, max }),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
