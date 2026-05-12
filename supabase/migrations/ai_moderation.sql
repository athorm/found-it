-- ═══════════════════════════════════════════════════════════════
-- AI Content Moderation — Database Migration
-- ═══════════════════════════════════════════════════════════════
-- This migration adds AI moderation columns to existing tables
-- and creates the ai_moderation_logs audit table.
--
-- SAFE: All changes are additive (ADD COLUMN IF NOT EXISTS).
-- Existing data is untouched — new columns get default values.
-- ═══════════════════════════════════════════════════════════════

-- ─── 1. Add AI flagging columns to items table ───
ALTER TABLE public.items
  ADD COLUMN IF NOT EXISTS ai_flagged BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ai_flag_reason TEXT;

-- ─── 2. Add AI flagging columns to messages table ───
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS ai_flagged BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ai_flag_reason TEXT;

-- ─── 3. Create ai_moderation_logs table ───
CREATE TABLE IF NOT EXISTS public.ai_moderation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type TEXT NOT NULL,           -- 'image' | 'message' | 'avatar'
  content_id UUID,                      -- optional FK to items.id or messages.id
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  ai_model TEXT NOT NULL,               -- model name used
  ai_result JSONB NOT NULL DEFAULT '{}', -- full API response
  flagged BOOLEAN DEFAULT FALSE,
  action_taken TEXT DEFAULT 'none',     -- 'none' | 'blocked' | 'flagged_for_review'
  admin_reviewed BOOLEAN DEFAULT FALSE,
  admin_decision TEXT,                  -- 'approved' | 'removed' | null
  reviewed_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 4. Indexes for efficient admin queries ───
CREATE INDEX IF NOT EXISTS idx_ai_logs_flagged
  ON public.ai_moderation_logs(flagged, admin_reviewed);

CREATE INDEX IF NOT EXISTS idx_ai_logs_user
  ON public.ai_moderation_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_ai_logs_created
  ON public.ai_moderation_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_items_ai_flagged
  ON public.items(ai_flagged) WHERE ai_flagged = TRUE;

-- ─── 5. Enable RLS on ai_moderation_logs ───
ALTER TABLE public.ai_moderation_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Only service role can INSERT (API routes use service role key)
-- No client-side SELECT — admin reads go through /api/admin/ routes with service role
-- This ensures the AI logs are admin-only and never exposed to regular users
