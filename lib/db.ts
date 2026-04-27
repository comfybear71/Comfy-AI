import { neon } from "@neondatabase/serverless"
import { drizzle } from "drizzle-orm/neon-http"
import * as schema from "./schema"

let _db: ReturnType<typeof drizzle> | null = null

export function getDb() {
  if (_db) return _db
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error("DATABASE_URL not configured")
  }
  const sql = neon(connectionString)
  _db = drizzle(sql, { schema })
  return _db
}
