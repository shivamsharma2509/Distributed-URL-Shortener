import { randomBytes } from "node:crypto";
import { and, asc, count, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db, urlMappingsTable, type UrlMapping } from "@workspace/db";
import { cacheUrl, getCachedUrl, invalidateUrl } from "./redis";

const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
const RESERVED_ALIASES = new Set(["api", "healthz", "actuator", "favicon.ico", "robots.txt"]);
const CACHE_TTL_SECONDS = Number(process.env["REDIS_CACHE_TTL_SECONDS"] ?? 3600);

export function encodeBase62(value: number): string {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error("Invalid numeric identifier");
  if (value === 0) return "0";
  let result = "";
  let remainder = value;
  while (remainder > 0) {
    result = ALPHABET[remainder % 62] + result;
    remainder = Math.floor(remainder / 62);
  }
  return result;
}

function placeholderCode(): string {
  return `p-${randomBytes(10).toString("base64url")}`;
}

export function isReservedAlias(alias: string): boolean {
  return RESERVED_ALIASES.has(alias.toLowerCase());
}

export async function createMapping(input: {
  originalUrl: string;
  customAlias?: string | null;
  expiresAt?: Date | null;
}): Promise<UrlMapping> {
  const shortCode = input.customAlias ?? placeholderCode();
  const mapping = await db.transaction(async (transaction) => {
    const [created] = await transaction
      .insert(urlMappingsTable)
      .values({
        shortCode,
        originalUrl: input.originalUrl,
        expiresAt: input.expiresAt ?? null,
        active: true,
        clickCount: 0,
      })
      .returning();

    if (input.customAlias) return created;

    const [withCode] = await transaction
      .update(urlMappingsTable)
      .set({ shortCode: encodeBase62(created.id), updatedAt: new Date() })
      .where(eq(urlMappingsTable.id, created.id))
      .returning();
    return withCode;
  });

  await cacheUrl(mapping.shortCode, { id: mapping.id, originalUrl: mapping.originalUrl }, CACHE_TTL_SECONDS);
  return mapping;
}

export async function findMapping(shortCode: string): Promise<UrlMapping | undefined> {
  const [mapping] = await db
    .select()
    .from(urlMappingsTable)
    .where(eq(urlMappingsTable.shortCode, shortCode))
    .limit(1);
  return mapping;
}

export async function findRedirect(shortCode: string): Promise<{ id: number; originalUrl: string } | null> {
  const cached = await getCachedUrl(shortCode);
  if (cached) return cached;

  const mapping = await findMapping(shortCode);
  if (!mapping || !mapping.active || (mapping.expiresAt && mapping.expiresAt <= new Date())) {
    return null;
  }

  await cacheUrl(shortCode, { id: mapping.id, originalUrl: mapping.originalUrl }, CACHE_TTL_SECONDS);
  return { id: mapping.id, originalUrl: mapping.originalUrl };
}

export async function incrementClickCount(id: number): Promise<void> {
  await db
    .update(urlMappingsTable)
    .set({
      clickCount: sql`${urlMappingsTable.clickCount} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(urlMappingsTable.id, id));
}

export async function listMappings(filters: {
  status: string;
  search?: string;
  page: number;
  pageSize: number;
}): Promise<{ items: UrlMapping[]; totalItems: number }> {
  const now = new Date();
  const conditions = [];
  if (filters.search) {
    conditions.push(
      or(
        ilike(urlMappingsTable.shortCode, `%${filters.search}%`),
        ilike(urlMappingsTable.originalUrl, `%${filters.search}%`),
      ),
    );
  }
  if (filters.status === "active") conditions.push(and(eq(urlMappingsTable.active, true), sql`(${urlMappingsTable.expiresAt} IS NULL OR ${urlMappingsTable.expiresAt} > ${now})`));
  if (filters.status === "disabled") conditions.push(eq(urlMappingsTable.active, false));
  if (filters.status === "expired") conditions.push(sql`${urlMappingsTable.expiresAt} IS NOT NULL AND ${urlMappingsTable.expiresAt} <= ${now}`);

  const where = conditions.length ? and(...conditions) : undefined;
  const [items, [{ total }]] = await Promise.all([
    db
      .select()
      .from(urlMappingsTable)
      .where(where)
      .orderBy(desc(urlMappingsTable.createdAt))
      .limit(filters.pageSize)
      .offset(filters.page * filters.pageSize),
    db.select({ total: count() }).from(urlMappingsTable).where(where),
  ]);

  return { items, totalItems: Number(total) };
}

export async function recentMappings(limit: number): Promise<UrlMapping[]> {
  return db
    .select()
    .from(urlMappingsTable)
    .orderBy(desc(urlMappingsTable.createdAt))
    .limit(limit);
}

export async function updateMapping(
  shortCode: string,
  input: { active?: boolean | null; expiresAt?: Date | null },
): Promise<UrlMapping | undefined> {
  const [mapping] = await db
    .update(urlMappingsTable)
    .set({
      ...(input.active !== undefined && input.active !== null ? { active: input.active } : {}),
      ...(input.expiresAt !== undefined ? { expiresAt: input.expiresAt } : {}),
      updatedAt: new Date(),
    })
    .where(eq(urlMappingsTable.shortCode, shortCode))
    .returning();
  await invalidateUrl(shortCode);
  return mapping;
}

export async function disableMapping(shortCode: string): Promise<UrlMapping | undefined> {
  return updateMapping(shortCode, { active: false });
}