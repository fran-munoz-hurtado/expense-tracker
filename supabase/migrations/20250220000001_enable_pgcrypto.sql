-- =====================================================
-- Enable pgcrypto for gen_random_bytes (used in invite token)
-- =====================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;
