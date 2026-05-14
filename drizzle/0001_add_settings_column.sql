-- Migration: add settings jsonb column to user_prefs
-- Run once against your Neon database, or use: npx drizzle-kit push

ALTER TABLE user_prefs
  ADD COLUMN IF NOT EXISTS settings jsonb NOT NULL DEFAULT '{}'::jsonb;
