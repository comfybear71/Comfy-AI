import { pgTable, serial, varchar, jsonb, timestamp, boolean, uuid, text, index } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"

export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: varchar("user_id", { length: 255 }).notNull(),
    title: varchar("title", { length: 200 }),
    repoOwner: varchar("repo_owner", { length: 100 }),
    repoName: varchar("repo_name", { length: 100 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    userIdx: index("conversations_user_idx").on(t.userId, t.updatedAt),
  })
)

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id")
      .references(() => conversations.id, { onDelete: "cascade" })
      .notNull(),
    role: varchar("role", { length: 20 }).notNull(),
    content: text("content").notNull(),
    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    convIdx: index("messages_conv_idx").on(t.conversationId, t.createdAt),
  })
)

export const conversationRelations = relations(conversations, ({ many }) => ({
  messages: many(messages),
}))

export const messageRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
}))

export const userPrefs = pgTable("user_prefs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull().unique(),
  theme: varchar("theme", { length: 20 }).notNull().default("system"),
  pinnedRepos: jsonb("pinned_repos").notNull().default([]),
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

export const councilLessons = pgTable(
  "council_lessons",
  {
    id: serial("id").primaryKey(),
    taskHash: varchar("task_hash", { length: 64 }).notNull(),
    task: text("task").notNull(),
    lesson: text("lesson").notNull(),
    avgScore: varchar("avg_score", { length: 10 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    hashIdx: index("council_lessons_hash_idx").on(t.taskHash),
  })
)

export type CouncilLesson = typeof councilLessons.$inferSelect
export type NewCouncilLesson = typeof councilLessons.$inferInsert

export type UserPref = typeof userPrefs.$inferSelect
export type NewUserPref = typeof userPrefs.$inferInsert
export type WebhookEvent = typeof webhookEvents.$inferSelect
export type NewWebhookEvent = typeof webhookEvents.$inferInsert
export type Conversation = typeof conversations.$inferSelect
export type NewConversation = typeof conversations.$inferInsert
export type Message = typeof messages.$inferSelect
export type NewMessage = typeof messages.$inferInsert
