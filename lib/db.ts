import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

const hasDatabaseUrl = !!process.env.DATABASE_URL;

// If DATABASE_URL is missing, export a typed empty object to avoid runtime crashes.
export const db = hasDatabaseUrl
  ? (globalThis.prisma || new PrismaClient())
  : ({} as PrismaClient);

if (hasDatabaseUrl && process.env.NODE_ENV !== "production") {
  globalThis.prisma = db;
}