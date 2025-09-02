
-- Backup current schema before migration
-- Run this first to backup existing data:

CREATE SCHEMA IF NOT EXISTS backup_$(date +%Y%m%d);

-- Backup existing users table if it exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'users') THEN
    EXECUTE 'CREATE TABLE backup_$(date +%Y%m%d).users_backup AS SELECT * FROM users';
    RAISE NOTICE 'Backed up existing users table';
  END IF;
END
$$;

-- Now apply the migration:
-- \i database/migrations/006_enhanced_user_management.sql
