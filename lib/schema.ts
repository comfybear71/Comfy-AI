import { pgTable, serial, varchar, jsonb, timestamp } from "drizzle-orm/pg-core"

export const userPrefs = pgTable("user_prefs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull().unique(),
  theme: varchar("theme", { length: 20 }).notNull().default("system"),
  pinnedRepos: jsonb("pinned_repos").notNull().default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
})

export type UserPref = typeof userPrefs.$inferSelect
export type NewUserPref = typeof userPrefs.$inferInsert
