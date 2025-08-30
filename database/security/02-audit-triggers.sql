-- Database Security - Audit Triggers
-- Automatically log all changes to sensitive tables

-- Create audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert audit record
    INSERT INTO audit_log (
        table_name,
        operation,
        old_data,
        new_data,
        user_name,
        ip_address,
        session_id
    ) VALUES (
        TG_TABLE_NAME,
        TG_OP,
        CASE WHEN TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN row_to_json(OLD) ELSE NULL END,
        CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN row_to_json(NEW) ELSE NULL END,
        coalesce(current_setting('application_name', true), 'unknown'),
        inet_client_addr(),
        current_setting('application_name', true)
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers for sensitive tables
DO $$
DECLARE
    table_name text;
    sensitive_tables text[] := ARRAY['drivers', 'passengers', 'bookings', 'incidents', 'users', 'operators'];
BEGIN
    FOREACH table_name IN ARRAY sensitive_tables
    LOOP
        -- Check if table exists before creating trigger
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = table_name AND table_schema = 'public') THEN
            -- Drop existing trigger if it exists
            EXECUTE format('DROP TRIGGER IF EXISTS audit_trigger ON %I', table_name);
            
            -- Create new audit trigger
            EXECUTE format('
                CREATE TRIGGER audit_trigger
                AFTER INSERT OR UPDATE OR DELETE ON %I
                FOR EACH ROW EXECUTE FUNCTION audit_trigger_function()
            ', table_name);
        END IF;
    END LOOP;
END
$$;

-- Create function to clean old audit logs (retention policy)
CREATE OR REPLACE FUNCTION cleanup_audit_logs(retention_days integer DEFAULT 90)
RETURNS void AS $$
BEGIN
    DELETE FROM audit_log 
    WHERE timestamp < CURRENT_DATE - INTERVAL '1 day' * retention_days;
    
    -- Log the cleanup operation
    INSERT INTO audit_log (
        table_name,
        operation,
        new_data,
        user_name
    ) VALUES (
        'audit_log',
        'CLEANUP',
        json_build_object('retention_days', retention_days, 'cleanup_date', CURRENT_TIMESTAMP),
        'system'
    );
END;
$$ LANGUAGE plpgsql;

-- Security: Only allow admin to execute cleanup
REVOKE ALL ON FUNCTION cleanup_audit_logs FROM PUBLIC;
GRANT EXECUTE ON FUNCTION cleanup_audit_logs TO xpress_admin;