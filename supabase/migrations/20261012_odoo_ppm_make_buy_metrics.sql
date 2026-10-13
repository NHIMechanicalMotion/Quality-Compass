-- ============================================================================
-- Migration: Add MO Production and Make vs Buy Rolling 12M metrics
-- Database: Supabase (jggdqmygudsiueaiqzcn)
-- Table: public.odoo_quality_ppm_metrics
-- ============================================================================

ALTER TABLE public.odoo_quality_ppm_metrics
ADD COLUMN IF NOT EXISTS mo_pieces_produced INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS mo_scrap_qty INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS mo_scrap_ppm INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS fg_make_sold_12m INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS fg_make_returned_12m INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS fg_make_ppm INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS fg_buy_sold_12m INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS fg_buy_returned_12m INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS fg_buy_ppm INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS fg_total_sold_12m INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS fg_total_returned_12m INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS fg_total_ppm INTEGER DEFAULT 0;
