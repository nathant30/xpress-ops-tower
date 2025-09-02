-- Adds transparency mode to control rider-facing breakdown
-- SQLite compatible version

-- Add transparency_mode column if it doesn't exist
ALTER TABLE pricing_profiles 
ADD COLUMN transparency_mode TEXT DEFAULT 'summary_only' 
CHECK (transparency_mode IN ('summary_only','detailed_breakdown'));

-- Ensure booking_fee exists (default ₱69) if you haven't added earlier
-- ALTER TABLE pricing_profiles 
-- ADD COLUMN booking_fee REAL DEFAULT 69.00;

-- Update existing records to have transparency mode
UPDATE pricing_profiles 
SET transparency_mode = 'summary_only' 
WHERE transparency_mode IS NULL;