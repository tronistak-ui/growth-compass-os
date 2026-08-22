-- Instagram Graph API returns a follower count, which the Meta connect/sync
-- flow needs somewhere to land — presence_profiles had no column for it.
ALTER TABLE public.presence_profiles
  ADD COLUMN IF NOT EXISTS instagram_followers integer DEFAULT 0;
