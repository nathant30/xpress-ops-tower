#!/usr/bin/env node

// Apply Enhanced User Management Migration
// Uses the existing database configuration to run the migration

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

async function applyMigration() {
  console.log('🚀 Applying Enhanced User Management Migration...\n');

  // Parse DATABASE_URL
  const databaseUrl = process.env.DATABASE_URL || "postgresql://localhost:5432/xpress_ops_tower";
  
  let config;
  if (databaseUrl.startsWith('postgresql://')) {
    const url = new URL(databaseUrl);
    config = {
      host: url.hostname,
      port: parseInt(url.port) || 5432,
      database: url.pathname.replace('/', ''),
      user: url.username,
      password: url.password,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    };
  } else {
    config = {
      host: 'localhost',
      port: 5432,
      database: 'xpress_ops_tower',
      user: 'postgres',
      password: 'postgres',
      ssl: false
    };
  }

  console.log(`📡 Connecting to database: ${config.host}:${config.port}/${config.database}`);

  const pool = new Pool(config);

  try {
    // Test connection
    const testResult = await pool.query('SELECT NOW() as now, version() as version');
    console.log(`✅ Connected to PostgreSQL: ${testResult.rows[0].version.split(',')[0]}`);
    console.log(`⏰ Server time: ${testResult.rows[0].now}\n`);

    // Read migration file
    const migrationPath = path.join(__dirname, '../database/migrations/006_enhanced_user_management.sql');
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log(`📄 Migration file loaded: ${Math.round(migrationSQL.length / 1024)}KB`);

    // Check if regions table exists (referenced by foreign key)
    const regionsCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'regions'
      );
    `);

    if (!regionsCheck.rows[0].exists) {
      console.log('⚠️  Creating regions table (required for foreign key constraints)...');
      await pool.query(`
        CREATE TABLE IF NOT EXISTS regions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(100) NOT NULL,
          code VARCHAR(20) NOT NULL UNIQUE,
          display_name VARCHAR(200) NOT NULL,
          country_code VARCHAR(2) DEFAULT 'PH',
          timezone VARCHAR(50) DEFAULT 'Asia/Manila',
          coordinates JSONB,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        INSERT INTO regions (name, code, display_name, coordinates) VALUES
        ('National Capital Region - Manila', 'ncr-manila', 'NCR Manila', '{"lat": 14.5995, "lng": 120.9842}'),
        ('Cebu', 'cebu', 'Cebu City', '{"lat": 10.3157, "lng": 123.8854}'),
        ('Davao', 'davao', 'Davao City', '{"lat": 7.1907, "lng": 125.4553}')
        ON CONFLICT (code) DO NOTHING;
      `);
    }

    // Apply migration in a transaction
    console.log('🔄 Applying migration...');
    await pool.query('BEGIN');

    try {
      // Execute migration SQL
      await pool.query(migrationSQL);
      await pool.query('COMMIT');
      
      console.log('✅ Migration applied successfully!\n');

      // Verify tables were created
      const tables = await pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('users', 'roles', 'user_roles', 'permissions', 'user_sessions', 'temporary_access', 'user_management_audit')
        ORDER BY table_name;
      `);

      console.log('📊 Created tables:');
      tables.rows.forEach(row => {
        console.log(`   ✓ ${row.table_name}`);
      });

      // Count created roles
      const rolesCount = await pool.query('SELECT COUNT(*) as count FROM roles WHERE is_system = TRUE');
      console.log(`\n🔑 System roles: ${rolesCount.rows[0].count} created`);

      // Count created permissions
      const permissionsCount = await pool.query('SELECT COUNT(*) as count FROM permissions');
      console.log(`🔐 Permissions: ${permissionsCount.rows[0].count} created`);

      console.log('\n🎉 Enhanced User Management migration completed successfully!');
      console.log('\nNext steps:');
      console.log('1. Update authentication imports in your codebase');
      console.log('2. Update API route protection with enhanced auth');
      console.log('3. Run tests to validate the enhanced auth system');

    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    
    if (error.message.includes('already exists')) {
      console.log('\n💡 Some tables may already exist. This might be expected if you\'ve run the migration before.');
      console.log('   To force a clean migration, you may need to drop existing tables first.');
    }
    
    process.exit(1);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  applyMigration();
}

module.exports = { applyMigration };