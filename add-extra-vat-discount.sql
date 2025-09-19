-- Adds extra VAT discount fields to quotes table
ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS extra_vat_discount_percent DECIMAL(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS extra_vat_discount_amount DECIMAL(10,2) DEFAULT 0;

