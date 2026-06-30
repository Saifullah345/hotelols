-- ============================================================
-- Migration 004: Allow Custom Plan Names
-- Run this in Supabase SQL Editor.
--
-- The original schema restricted plans.name to ('basic','pro','enterprise')
-- via a CHECK constraint. Combined with UNIQUE(name) — and those three names
-- already seeded — this made the "New Plan" screen impossible to use (every
-- insert either collided or violated the CHECK). Drop the CHECK so admins can
-- create custom pricing tiers; UNIQUE(name) is kept so names stay distinct.
-- ============================================================

ALTER TABLE plans DROP CONSTRAINT IF EXISTS plans_name_check;
