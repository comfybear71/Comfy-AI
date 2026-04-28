import { pgTable, serial, varchar, jsonb, timestamp, boolean } from "drizzle-orm/pg-core"

export const userPrefs = pgTable("user_prefs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull().unique(),
  theme: varchar("theme", { length: 20 }).notNull().default("system"),
  pinnedRepos: jsonb("pinned_repos").notNull().default([]),
  // Flexible settings bag: selectedRepo, selectedModel, activeDocFiles, etc.
  settings: jsonb("settings").notNull().default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
})

export const webhookEvents = pgTable("webhook_events", {
  id: serial("id").primaryKey(),
  eventType: varchar("event_type", { length: 50 }).notNull(),
  action: varchar("action", { length: 50 }).notNull(),
  repoOwner: varchar("repo_owner", { length: 100 }).notNull(),
  repoName: varchar("repo_name", { length: 100 }).notNull(),
  title: varchar("title", { length: 500 }),
  payload: jsonb("payload").notNull(),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
})

export type UserPref = typeof userPrefs.$inferSelect
export type NewUserPref = typeof userPrefs.$inferInsert

export type WebhookEvent = typeof webhookEvents.$inferSelect
export type NewWebhookEvent = typeof webhookEvents.$inferInsert
