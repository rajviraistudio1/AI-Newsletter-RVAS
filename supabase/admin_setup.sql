-- ===========================================================================
-- RVAS Newsletter — Admin Dashboard RLS Policies
-- Run this ENTIRE script in Supabase Dashboard → SQL Editor → New Query
-- AFTER you have already run supabase/setup.sql
-- ===========================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Allow authenticated users (admin) to READ all subscribers
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "Admin can read all subscribers"
    ON public.subscribers
    FOR SELECT
    TO authenticated
    USING (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Allow authenticated users (admin) to DELETE subscribers
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "Admin can delete subscribers"
    ON public.subscribers
    FOR DELETE
    TO authenticated
    USING (true);
