-- View: users by role (for UI)
CREATE OR REPLACE VIEW v_users_by_role AS
SELECT r.id AS role_id,
       r.name AS role_name,
       ur.user_id,
       u.email,
       COALESCE(u.display_name, split_part(u.email,'@',1)) AS user_name,
       ur.assigned_at
FROM rbac_roles r
JOIN user_roles ur ON ur.role_id = r.id
JOIN users u ON u.id = ur.user_id;

-- Indexes for API performance
CREATE INDEX IF NOT EXISTS idx_role_name ON rbac_roles (name);
CREATE INDEX IF NOT EXISTS idx_role_level ON rbac_roles (level);
CREATE INDEX IF NOT EXISTS idx_role_pending_status ON rbac_role_pending_changes (status, created_at);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles (user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles (role_id);
CREATE INDEX IF NOT EXISTS idx_role_versions_role_id ON rbac_role_versions (role_id, version DESC);