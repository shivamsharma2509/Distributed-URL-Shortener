import { bigint, boolean, index, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const urlMappingsTable = pgTable(
  "url_mappings",
  {
    id: serial("id").primaryKey(),
    shortCode: varchar("short_code", { length: 32 }).notNull().unique(),
    originalUrl: varchar("original_url", { length: 2048 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    active: boolean("active").notNull().default(true),
    clickCount: bigint("click_count", { mode: "number" }).notNull().default(0),
  },
  (table) => ({
    createdAtIdx: index("url_mappings_created_at_idx").on(table.createdAt),
    expiresAtIdx: index("url_mappings_expires_at_idx").on(table.expiresAt),
    activeIdx: index("url_mappings_active_idx").on(table.active),
  }),
);

export const insertUrlMappingSchema = createInsertSchema(urlMappingsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUrlMapping = z.infer<typeof insertUrlMappingSchema>;
export type UrlMapping = typeof urlMappingsTable.$inferSelect;