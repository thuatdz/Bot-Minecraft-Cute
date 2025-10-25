import { sql } from "drizzle-orm";
import { pgTable, text, varchar, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const bots = pgTable("bots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull(),
  server: text("server").notNull(),
  status: text("status").notNull().default("offline"), // online, offline, connecting, error
  autoReconnect: boolean("auto_reconnect").notNull().default(true),
  chatEnabled: boolean("chat_enabled").notNull().default(true),
  movementPattern: text("movement_pattern").notNull().default("random"), // random, follow, stay, custom
  responseDelay: integer("response_delay").notNull().default(1000),
  uptime: integer("uptime").notNull().default(0), // in seconds
  lastSeen: timestamp("last_seen"),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertBotSchema = createInsertSchema(bots).pick({
  username: true,
  server: true,
  autoReconnect: true,
  chatEnabled: true,
  movementPattern: true,
  responseDelay: true,
});

export const updateBotConfigSchema = createInsertSchema(bots).pick({
  autoReconnect: true,
  chatEnabled: true,
  movementPattern: true,
  responseDelay: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Bot = typeof bots.$inferSelect;
export type InsertBot = z.infer<typeof insertBotSchema>;
export type UpdateBotConfig = z.infer<typeof updateBotConfigSchema>;
