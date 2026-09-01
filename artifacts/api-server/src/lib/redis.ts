import Redis from "ioredis";
import { logger } from "./logger";

export type CachedMapping = { id: number; originalUrl: string };

const redisUrl =
  process.env["REDIS_URL"] ??
  (process.env["REDIS_HOST"]
    ? `redis://${process.env["REDIS_HOST"]}:${process.env["REDIS_PORT"] ?? "6379"}`
    : undefined);

const client = redisUrl
  ? new Redis(redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    })
  : null;

let connectPromise: Promise<void> | null = null;

if (client) {
  client.on("error", (error) => {
    logger.warn({ err: error }, "Redis unavailable; using database fallback");
  });
}

async function getClient(): Promise<Redis | null> {
  if (!client) return null;
  if (client.status === "ready") return client;
  if (!connectPromise) {
    connectPromise = client.connect().then(() => undefined).catch(() => undefined);
  }
  await connectPromise;
  return (client.status as string) === "ready" ? client : null;
}

export async function getCachedUrl(shortCode: string): Promise<CachedMapping | null> {
  const connection = await getClient();
  if (!connection) return null;
  try {
    const value = await connection.get(`url-shortener:v1:${shortCode}`);
    if (!value) return null;
    const parsed = JSON.parse(value) as CachedMapping;
    return typeof parsed.id === "number" && typeof parsed.originalUrl === "string" ? parsed : null;
  } catch {
    return null;
  }
}

export async function cacheUrl(
  shortCode: string,
  mapping: CachedMapping,
  ttlSeconds: number,
): Promise<void> {
  const connection = await getClient();
  if (!connection) return;
  try {
    await connection.set(`url-shortener:v1:${shortCode}`, JSON.stringify(mapping), "EX", ttlSeconds);
  } catch {
    // Redis is an optimization. A failed write must not fail URL creation.
  }
}

export async function invalidateUrl(shortCode: string): Promise<void> {
  const connection = await getClient();
  if (!connection) return;
  try {
    await connection.del(`url-shortener:v1:${shortCode}`);
  } catch {
    // The database remains authoritative when invalidation is unavailable.
  }
}

export async function allowCreateRequest(
  clientKey: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  const connection = await getClient();
  if (!connection) return true;
  try {
    const key = `url-shortener:rate:create:${clientKey}:${Math.floor(Date.now() / 1000 / windowSeconds)}`;
    const count = await connection.incr(key);
    if (count === 1) await connection.expire(key, windowSeconds);
    return count <= limit;
  } catch {
    return true;
  }
}