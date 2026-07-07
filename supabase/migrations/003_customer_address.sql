-- ============================================================
-- Migration 003: Customer Address Fields
-- Run this in Supabase SQL Editor after the earlier migrations.
-- Adds location details to user profiles (used mainly for customers).
-- ============================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS city    TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address TEXT;
