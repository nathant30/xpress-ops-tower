-- Database Security Setup - User Privilege Separation
-- This script creates separate users for different database operations

-- Create read-only user for application queries
CREATE USER xpress_reader WITH ENCRYPTED PASSWORD 'CHANGE_ME_READER_PASSWORD';
GRANT CONNECT ON DATABASE xpress_ops_tower TO xpress_reader;
GRANT USAGE ON SCHEMA public TO xpress_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO xpress_reader;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO xpress_reader;

-- Create read-write user for application operations
CREATE USER xpress_writer WITH ENCRYPTED PASSWORD 'CHANGE_ME_WRITER_PASSWORD';
GRANT CONNECT ON DATABASE xpress_ops_tower TO xpress_writer;
GRANT USAGE ON SCHEMA public TO xpress_writer;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO xpress_writer;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO xpress_writer;

-- Create admin user for migrations and maintenance
CREATE USER xpress_admin WITH ENCRYPTED PASSWORD 'CHANGE_ME_ADMIN_PASSWORD';
GRANT CONNECT ON DATABASE xpress_ops_tower TO xpress_admin;
GRANT ALL PRIVILEGES ON DATABASE xpress_ops_tower TO xpress_admin;
GRANT ALL PRIVILEGES ON SCHEMA public TO xpress_admin;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO xpress_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO xpress_admin;

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO xpress_reader;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON SEQUENCES TO xpress_reader;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO xpress_writer;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO xpress_writer;

-- Security: Revoke unnecessary permissions from public
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO PUBLIC;

-- Enable row level security on sensitive tables
ALTER TABLE IF EXISTS drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS passengers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS incidents ENABLE ROW LEVEL SECURITY;

-- Create audit log table for tracking sensitive operations
CREATE TABLE IF NOT EXISTS audit_log (
    id SERIAL PRIMARY KEY,
    table_name VARCHAR(255) NOT NULL,
    operation VARCHAR(10) NOT NULL,
    old_data JSONB,
    new_data JSONB,
    user_name VARCHAR(255) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    session_id VARCHAR(255)
);

-- Create index on audit log for performance
CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_log_table_name ON audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_name ON audit_log(user_name);

-- Grant audit log permissions
GRANT INSERT ON audit_log TO xpress_writer;
GRANT SELECT ON audit_log TO xpress_reader, xpress_writer;
GRANT ALL PRIVILEGES ON audit_log TO xpress_admin;