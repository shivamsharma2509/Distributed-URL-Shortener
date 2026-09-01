import { Router, type IRouter } from "express";
import { desc, sql } from "drizzle-orm";
import {
  CreateUrlBody,
  CreateUrlResponse,
  DeleteUrlParams,
  GetDashboardSummaryResponse,
  GetUrlParams,
  GetUrlResponse,
  GetUrlStatsParams,
  GetUrlStatsResponse,
  ListUrlsQueryParams,
  ListUrlsResponse,
  UpdateUrlBody,
  UpdateUrlParams,
  UpdateUrlResponse,
} from "@workspace/api-zod";
import { db, urlMappingsTable } from "@workspace/db";
import { allowCreateRequest } from "../lib/redis";
import {
  createMapping,
  disableMapping,
  findMapping,
  incrementClickCount,
  isReservedAlias,
  listMappings,
  recentMappings,
  updateMapping,
} from "../lib/url-shortener";

const router: IRouter = Router();

function publicUrl(req: Parameters<Parameters<IRouter["get"]>[1]>[0], shortCode: string): string {
  const configured = process.env["SHORT_URL_BASE_URL"];
  const base = configured?.replace(/\/$/, "") ?? `${req.protocol}://${req.get("host")}`;
  return `${base}/api/r/${shortCode}`;
}

function toResponse(req: Parameters<Parameters<IRouter["get"]>[1]>[0], mapping: typeof urlMappingsTable.$inferSelect) {
  return {
    shortCode: mapping.shortCode,
    shortUrl: publicUrl(req, mapping.shortCode),
    originalUrl: mapping.originalUrl,
    createdAt: mapping.createdAt,
    expiresAt: mapping.expiresAt,
    active: mapping.active,
    clickCount: mapping.clickCount,
    updatedAt: mapping.updatedAt,
  };
}

function errorResponse(req: Parameters<Parameters<IRouter["get"]>[1]>[0], status: number, error: string, message: string) {
  return {
    timestamp: new Date(),
    status,
    error,
    message,
    path: req.path,
  };
}

router.get("/v1/dashboard/summary", async (req, res): Promise<void> => {
  const [[{ total }], [{ active }], [{ clicks }], recent] = await Promise.all([
    db.select({ total: sql<number>`count(*)` }).from(urlMappingsTable),
    db.select({ active: sql<number>`count(*) filter (where ${urlMappingsTable.active} = true and (${urlMappingsTable.expiresAt} is null or ${urlMappingsTable.expiresAt} > now()))` }).from(urlMappingsTable),
    db.select({ clicks: sql<number>`coalesce(sum(${urlMappingsTable.clickCount}), 0)` }).from(urlMappingsTable),
    recentMappings(5),
  ]);
  res.json(GetDashboardSummaryResponse.parse({
    totalUrls: Number(total),
    activeUrls: Number(active),
    totalClicks: Number(clicks),
    recentUrls: recent.map((mapping) => toResponse(req, mapping)),
  }));
});

router.get("/v1/urls", async (req, res): Promise<void> => {
  const parsed = ListUrlsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json(errorResponse(req, 400, "INVALID_REQUEST", parsed.error.message));
    return;
  }
  const result = await listMappings(parsed.data);
  res.json(ListUrlsResponse.parse({
    items: result.items.map((mapping) => toResponse(req, mapping)),
    page: parsed.data.page,
    pageSize: parsed.data.pageSize,
    totalItems: result.totalItems,
    totalPages: Math.ceil(result.totalItems / parsed.data.pageSize),
  }));
});

router.post("/v1/urls", async (req, res): Promise<void> => {
  const parsed = CreateUrlBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.message }, "Invalid URL creation request");
    res.status(400).json(errorResponse(req, 400, "INVALID_REQUEST", parsed.error.message));
    return;
  }
  const allowed = await allowCreateRequest(req.ip ?? "unknown", Number(process.env["CREATE_RATE_LIMIT"] ?? 30), 60);
  if (!allowed) {
    res.status(429).json(errorResponse(req, 429, "RATE_LIMITED", "Too many URL creation requests"));
    return;
  }
  if (parsed.data.customAlias && isReservedAlias(parsed.data.customAlias)) {
    res.status(400).json(errorResponse(req, 400, "INVALID_ALIAS", "That alias is reserved"));
    return;
  }
  if (parsed.data.expiresAt && parsed.data.expiresAt <= new Date()) {
    res.status(400).json(errorResponse(req, 400, "INVALID_EXPIRATION", "Expiration must be in the future"));
    return;
  }
  try {
    const mapping = await createMapping(parsed.data);
    req.log.info({ shortCode: mapping.shortCode }, "URL mapping created");
    res.status(201).json(CreateUrlResponse.parse(toResponse(req, mapping)));
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes("duplicate key")) {
      res.status(409).json(errorResponse(req, 409, "DUPLICATE_ALIAS", "That custom alias is already in use"));
      return;
    }
    throw error;
  }
});

router.get("/v1/urls/:shortCode", async (req, res): Promise<void> => {
  const params = GetUrlParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json(errorResponse(req, 400, "INVALID_SHORT_CODE", params.error.message));
    return;
  }
  const mapping = await findMapping(params.data.shortCode);
  if (!mapping) {
    res.status(404).json(errorResponse(req, 404, "URL_NOT_FOUND", "Short URL does not exist"));
    return;
  }
  res.json(GetUrlResponse.parse(toResponse(req, mapping)));
});

router.patch("/v1/urls/:shortCode", async (req, res): Promise<void> => {
  const params = UpdateUrlParams.safeParse(req.params);
  const body = UpdateUrlBody.safeParse(req.body);
  if (!params.success) {
    res.status(400).json(errorResponse(req, 400, "INVALID_REQUEST", params.error.message));
    return;
  }
  if (!body.success) {
    res.status(400).json(errorResponse(req, 400, "INVALID_REQUEST", body.error.message));
    return;
  }
  const mapping = await updateMapping(params.data.shortCode, body.data);
  if (!mapping) {
    res.status(404).json(errorResponse(req, 404, "URL_NOT_FOUND", "Short URL does not exist"));
    return;
  }
  res.json(UpdateUrlResponse.parse(toResponse(req, mapping)));
});

router.delete("/v1/urls/:shortCode", async (req, res): Promise<void> => {
  const params = DeleteUrlParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json(errorResponse(req, 400, "INVALID_SHORT_CODE", params.error.message));
    return;
  }
  const mapping = await disableMapping(params.data.shortCode);
  if (!mapping) {
    res.status(404).json(errorResponse(req, 404, "URL_NOT_FOUND", "Short URL does not exist"));
    return;
  }
  res.status(204).send();
});

router.get("/v1/urls/:shortCode/stats", async (req, res): Promise<void> => {
  const params = GetUrlStatsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json(errorResponse(req, 400, "INVALID_SHORT_CODE", params.error.message));
    return;
  }
  const mapping = await findMapping(params.data.shortCode);
  if (!mapping) {
    res.status(404).json(errorResponse(req, 404, "URL_NOT_FOUND", "Short URL does not exist"));
    return;
  }
  res.json(GetUrlStatsResponse.parse({
    shortCode: mapping.shortCode,
    clickCount: mapping.clickCount,
    active: mapping.active,
    expiresAt: mapping.expiresAt,
    lastUpdatedAt: mapping.updatedAt,
  }));
});

export default router;