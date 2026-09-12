-- ===========================================================================
-- RVAS Newsletter — Supabase Database Setup
-- Run this ENTIRE script in Supabase Dashboard → SQL Editor → New Query
-- ===========================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Create the subscribers table
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.subscribers (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email       TEXT NOT NULL,
    source      TEXT DEFAULT 'hero_section',
    created_at  TIMESTAMPTZ DEFAULT now() NOT NULL,

    -- Prevent duplicate emails at the database level
    CONSTRAINT subscribers_email_unique UNIQUE (email)
);

COMMENT ON TABLE public.subscribers IS 'Newsletter subscriber emails collected from the RVAS landing page.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Enable Row Level Security (RLS)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. RLS Policy: Allow anonymous visitors to INSERT (subscribe) only
--    No SELECT, UPDATE, or DELETE policies = visitors CANNOT read or
--    modify any subscriber data.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "Allow public insert"
    ON public.subscribers
    FOR INSERT
    TO anon
    WITH CHECK (true);
