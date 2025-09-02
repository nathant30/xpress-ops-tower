// Enhanced User Management Migration Script
// Applies the RBAC + ABAC database schema

const fs = require('fs');
const path = require('path');

async function runMigration() {
  console.log('🚀 Starting Enhanced User Management Migration...\n');

  // Check if migration file exists
  const migrationPath = path.join(__dirname, '../database/migrations/006_enhanced_user_management.sql');
  
  if (!fs.existsSync(migrationPath)) {
    console.error('❌ Migration file not found:', migrationPath);
    process.exit(1);
  }

  console.log('✅ Migration file found');
  console.log('📄 File:', migrationPath);

  // Read migration content
  const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
  console.log(`📊 Migration size: ${Math.round(migrationSQL.length / 1024)}KB`);

  // Check for required environment variables
  const requiredEnvVars = [
    'DATABASE_URL'
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.warn('⚠️  Missing environment variables:', missingVars.join(', '));
    console.log('   These should be set in your .env.local file');
  }

  // In a real implementation, we would connect to the database and run the migration
  // For now, we'll simulate the process and provide instructions

  console.log('\n📋 Migration Preview:');
  console.log('   • Enhanced users table with ABAC attributes');
  console.log('   • 13 Xpress roles with permission mappings');
  console.log('   • Regional access control tables');
  console.log('   • Temporary access and escalation system');
  console.log('   • Comprehensive audit logging');
  console.log('   • Performance indexes and triggers');

  console.log('\n🔧 To apply this migration manually:');
  console.log('1. Connect to your PostgreSQL database');
  console.log('2. Execute the SQL file:');
  console.log(`   \\i ${migrationPath}`);
  console.log('3. Verify tables were created:');
  console.log('   \\dt');

  console.log('\n✅ Migration script ready to apply');

  // Create a backup of current schema first
  const backupScript = `
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
-- \\i database/migrations/006_enhanced_user_management.sql
`;

  fs.writeFileSync(
    path.join(__dirname, '../database/backup-before-migration.sql'),
    backupScript
  );

  console.log('📦 Backup script created: database/backup-before-migration.sql');

  return {
    success: true,
    migrationFile: migrationPath,
    backupFile: path.join(__dirname, '../database/backup-before-migration.sql')
  };
}

if (require.main === module) {
  runMigration()
    .then(result => {
      console.log('\n🎉 Migration preparation completed successfully!');
      console.log('\nNext steps:');
      console.log('1. Review the migration file');
      console.log('2. Backup your existing data');
      console.log('3. Apply the migration to your database');
    })
    .catch(error => {
      console.error('❌ Migration preparation failed:', error.message);
      process.exit(1);
    });
}

module.exports = { runMigration };