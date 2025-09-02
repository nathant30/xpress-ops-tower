// Automated Migration Runner System
// Zero-downtime database migrations with rollback capabilities and validation
// Supports both SQLite and PostgreSQL with environment-specific migration handling

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, extname } from 'path';
import type { DatabaseAdapter, TransactionContext } from './connection-manager';
import { getDatabaseManager } from './connection-manager';
import { logger } from '../security/productionLogger';

// =====================================================
// Migration Types and Interfaces
// =====================================================

export interface MigrationMetadata {
  version: string;
  description: string;
  dependencies?: string[];
  environmentSpecific?: boolean;
  postgresqlOnly?: boolean;
  sqliteOnly?: boolean;
  rollbackSupported?: boolean;
  checksum?: string;
}

export interface MigrationFile {
  version: string;
  filename: string;
  path: string;
  metadata: MigrationMetadata;
  upSql: string;
  downSql?: string;
}

export interface MigrationResult {
  version: string;
  success: boolean;
  duration: number;
  error?: string;
  rowsAffected?: number;
  warnings?: string[];
}

export interface MigrationPlan {
  migrations: MigrationFile[];
  totalCount: number;
  estimatedDuration: number;
  hasBreakingChanges: boolean;
  requiresDowntime: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  incompatibilities: string[];
}

// =====================================================
// Migration Runner Configuration
// =====================================================

export interface MigrationConfig {
  migrationsPath: string;
  schemaTable: string;
  lockTable: string;
  backupBeforeMigration: boolean;
  validateBeforeRun: boolean;
  allowRollback: boolean;
  maxConcurrentMigrations: number;
  timeoutMs: number;
  dryRun: boolean;
}

export class MigrationRunner {
  private db: DatabaseAdapter;
  private config: MigrationConfig;
  private isLocked = false;
  private lockId: string;

  constructor(config: Partial<MigrationConfig> = {}) {
    this.db = getDatabaseManager().getAdapter();
    this.lockId = `migration_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.config = {
      migrationsPath: config.migrationsPath || join(process.cwd(), 'database', 'migrations'),
      schemaTable: config.schemaTable || 'schema_migrations',
      lockTable: config.lockTable || 'migration_locks',
      backupBeforeMigration: config.backupBeforeMigration ?? (process.env.NODE_ENV === 'production'),
      validateBeforeRun: config.validateBeforeRun ?? true,
      allowRollback: config.allowRollback ?? true,
      maxConcurrentMigrations: config.maxConcurrentMigrations || 1,
      timeoutMs: config.timeoutMs || 300000, // 5 minutes
      dryRun: config.dryRun ?? false,
      ...config
    };
  }

  // =====================================================
  // Main Migration Operations
  // =====================================================

  async runMigrations(targetVersion?: string): Promise<MigrationResult[]> {
    try {
      await this.acquireLock();
      await this.ensureMigrationTables();
      
      const pendingMigrations = await this.getPendingMigrations(targetVersion);
      
      if (pendingMigrations.length === 0) {
        logger.info('No pending migrations to run', {}, { 
          component: 'MigrationRunner', 
          action: 'runMigrations' 
        });
        return [];
      }

      const migrationPlan = await this.createMigrationPlan(pendingMigrations);
      
      if (this.config.validateBeforeRun) {
        const validation = await this.validateMigrationPlan(migrationPlan);
        if (!validation.isValid) {
          throw new Error(`Migration validation failed: ${validation.errors.join(', ')}`);
        }
      }

      logger.info('Starting migration execution', {
        totalMigrations: migrationPlan.totalCount,
        estimatedDuration: migrationPlan.estimatedDuration,
        requiresDowntime: migrationPlan.requiresDowntime
      }, { component: 'MigrationRunner', action: 'runMigrations' });

      const results: MigrationResult[] = [];

      for (const migration of migrationPlan.migrations) {
        const result = await this.executeMigration(migration);
        results.push(result);
        
        if (!result.success) {
          logger.error('Migration failed, stopping execution', {
            failedVersion: migration.version,
            error: result.error
          }, { component: 'MigrationRunner', action: 'runMigrations' });
          break;
        }
      }

      return results;
    } finally {
      await this.releaseLock();
    }
  }

  async rollbackMigration(version: string): Promise<MigrationResult> {
    if (!this.config.allowRollback) {
      throw new Error('Rollback is disabled in current configuration');
    }

    try {
      await this.acquireLock();
      
      const migration = await this.getMigrationByVersion(version);
      if (!migration) {
        throw new Error(`Migration ${version} not found`);
      }

      if (!migration.downSql) {
        throw new Error(`Migration ${version} does not support rollback`);
      }

      logger.info('Starting migration rollback', {
        version: migration.version,
        description: migration.metadata.description
      }, { component: 'MigrationRunner', action: 'rollbackMigration' });

      return await this.executeRollback(migration);
    } finally {
      await this.releaseLock();
    }
  }

  async getMigrationStatus(): Promise<{
    applied: MigrationMetadata[];
    pending: MigrationMetadata[];
    failed: MigrationMetadata[];
  }> {
    await this.ensureMigrationTables();
    
    const appliedMigrations = await this.db.query(
      `SELECT version, description, applied_at, checksum FROM ${this.config.schemaTable} ORDER BY version`
    );

    const allMigrations = await this.loadMigrationFiles();
    const appliedVersions = new Set(appliedMigrations.rows.map(r => r.version));
    
    const pending = allMigrations
      .filter(m => !appliedVersions.has(m.version))
      .map(m => m.metadata);

    return {
      applied: appliedMigrations.rows.map(row => ({
        version: row.version,
        description: row.description
      })),
      pending,
      failed: await this.getFailedMigrations()
    };
  }

  private async getFailedMigrations(): Promise<Array<{version: string, description: string, error: string, attemptedAt: string}>> {
    try {
      const result = await this.db.query(
        `SELECT version, description, error_message, attempted_at 
         FROM ${this.config.schemaTable}_failed 
         ORDER BY attempted_at DESC`
      );
      
      return result.rows.map(row => ({
        version: row.version,
        description: row.description || '',
        error: row.error_message || '',
        attemptedAt: row.attempted_at
      }));
    } catch (error) {
      // Table might not exist yet
      return [];
    }
  }

  private async recordFailedMigration(migration: MigrationFile, error: Error, executionTimeMs: number): Promise<void> {
    try {
      await this.db.query(
        `INSERT INTO ${this.config.schemaTable}_failed 
         (version, description, error_message, error_stack, execution_time_ms, checksum)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          migration.version,
          migration.description,
          error.message,
          error.stack,
          executionTimeMs,
          migration.checksum
        ]
      );
      
      this.logger.error('Migration failed and recorded', {
        version: migration.version,
        description: migration.description,
        error: error.message,
        executionTimeMs
      });
    } catch (recordError) {
      this.logger.error('Failed to record migration failure', {
        version: migration.version,
        originalError: error.message,
        recordError: recordError.message
      });
    }
  }

  // =====================================================
  // Migration File Loading and Parsing
  // =====================================================

  private async loadMigrationFiles(): Promise<MigrationFile[]> {
    if (!existsSync(this.config.migrationsPath)) {
      throw new Error(`Migrations directory not found: ${this.config.migrationsPath}`);
    }

    const files = readdirSync(this.config.migrationsPath)
      .filter(file => extname(file) === '.sql')
      .sort();

    const migrations: MigrationFile[] = [];

    for (const filename of files) {
      const migration = await this.parseMigrationFile(filename);
      if (migration) {
        migrations.push(migration);
      }
    }

    return migrations;
  }

  private async parseMigrationFile(filename: string): Promise<MigrationFile | null> {
    const filePath = join(this.config.migrationsPath, filename);
    const content = readFileSync(filePath, 'utf8');
    
    // Extract version from filename (e.g., "001_initial_setup.sql" -> "001")
    const versionMatch = filename.match(/^(\d+)_/);
    if (!versionMatch) {
      logger.warn('Skipping migration file with invalid format', {
        filename
      }, { component: 'MigrationRunner', action: 'parseMigrationFile' });
      return null;
    }

    const version = versionMatch[1];
    
    // Parse metadata from comments
    const metadata = this.extractMigrationMetadata(content, filename);
    
    // Check environment compatibility
    const databaseType = getDatabaseManager().getAdapter().constructor.name.toLowerCase();
    
    if (metadata.postgresqlOnly && !databaseType.includes('postgresql')) {
      logger.debug('Skipping PostgreSQL-only migration in current environment', {
        version,
        filename,
        currentType: databaseType
      }, { component: 'MigrationRunner', action: 'parseMigrationFile' });
      return null;
    }
    
    if (metadata.sqliteOnly && !databaseType.includes('sqlite')) {
      logger.debug('Skipping SQLite-only migration in current environment', {
        version,
        filename,
        currentType: databaseType
      }, { component: 'MigrationRunner', action: 'parseMigrationFile' });
      return null;
    }

    // Split up/down SQL
    const { upSql, downSql } = this.splitMigrationSql(content);

    return {
      version,
      filename,
      path: filePath,
      metadata,
      upSql,
      downSql
    };
  }

  private extractMigrationMetadata(content: string, filename: string): MigrationMetadata {
    const lines = content.split('\n');
    const metadata: Partial<MigrationMetadata> = {
      version: '',
      description: ''
    };

    for (const line of lines.slice(0, 20)) { // Check first 20 lines
      const trimmed = line.trim();
      
      if (trimmed.startsWith('-- Description:')) {
        metadata.description = trimmed.replace('-- Description:', '').trim();
      } else if (trimmed.includes('PostgreSQL Migration') || trimmed.includes('COMPATIBILITY: PostgreSQL')) {
        metadata.postgresqlOnly = true;
      } else if (trimmed.includes('SQLite Migration') || trimmed.includes('COMPATIBILITY: SQLite')) {
        metadata.sqliteOnly = true;
      } else if (trimmed.includes('COMPATIBILITY: This migration')) {
        // Parse compatibility notes
        if (trimmed.includes('PostgreSQL-specific')) {
          metadata.postgresqlOnly = true;
        }
      } else if (trimmed.startsWith('-- Dependencies:')) {
        const deps = trimmed.replace('-- Dependencies:', '').trim().split(',');
        metadata.dependencies = deps.map(d => d.trim()).filter(d => d);
      } else if (trimmed.includes('-- ROLLBACK_SUPPORTED')) {
        metadata.rollbackSupported = true;
      }
    }

    // Extract version and description from filename if not in metadata
    if (!metadata.description) {
      const desc = filename.replace(/^\d+_/, '').replace(/\.sql$/, '').replace(/_/g, ' ');
      metadata.description = desc.charAt(0).toUpperCase() + desc.slice(1);
    }

    // Generate checksum
    metadata.checksum = this.generateChecksum(content);

    return metadata as MigrationMetadata;
  }

  private splitMigrationSql(content: string): { upSql: string; downSql?: string } {
    const upDownSeparator = /--\s*====+\s*ROLLBACK\s*====+/i;
    const parts = content.split(upDownSeparator);
    
    if (parts.length > 1) {
      return {
        upSql: parts[0].trim(),
        downSql: parts[1].trim()
      };
    }

    return { upSql: content.trim() };
  }

  private generateChecksum(content: string): string {
    // Simple checksum - in production, consider using crypto.createHash
    return content.length.toString(36) + content.charCodeAt(0).toString(36);
  }

  // =====================================================
  // Migration Execution
  // =====================================================

  private async executeMigration(migration: MigrationFile): Promise<MigrationResult> {
    const startTime = Date.now();
    
    logger.info('Executing migration', {
      version: migration.version,
      description: migration.metadata.description,
      filename: migration.filename
    }, { component: 'MigrationRunner', action: 'executeMigration' });

    try {
      let rowsAffected = 0;
      const warnings: string[] = [];

      if (this.config.dryRun) {
        logger.info('DRY RUN: Would execute migration', {
          version: migration.version,
          sql: migration.upSql.substring(0, 200) + '...'
        }, { component: 'MigrationRunner', action: 'executeMigration' });
      } else {
        await this.db.transaction(async (tx) => {
          // Execute the migration SQL
          const statements = this.splitSqlStatements(migration.upSql);
          
          for (const statement of statements) {
            if (statement.trim()) {
              const result = await tx.query(statement);
              rowsAffected += result.rowCount || 0;
            }
          }

          // Record the migration
          await tx.query(
            `INSERT INTO ${this.config.schemaTable} (version, description, applied_at, checksum) 
             VALUES (?, ?, ?, ?)`,
            [migration.version, migration.metadata.description, new Date().toISOString(), migration.metadata.checksum]
          );
        });
      }

      const duration = Date.now() - startTime;
      
      logger.info('Migration completed successfully', {
        version: migration.version,
        duration,
        rowsAffected,
        warnings: warnings.length
      }, { component: 'MigrationRunner', action: 'executeMigration' });

      return {
        version: migration.version,
        success: true,
        duration,
        rowsAffected,
        warnings
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = (error as Error).message;
      
      logger.error('Migration failed', {
        version: migration.version,
        error: errorMessage,
        duration
      }, { component: 'MigrationRunner', action: 'executeMigration' });

      // Record failed migration for tracking
      await this.recordFailedMigration(migration, error as Error, duration);

      return {
        version: migration.version,
        success: false,
        duration,
        error: errorMessage
      };
    }
  }

  private async executeRollback(migration: MigrationFile): Promise<MigrationResult> {
    if (!migration.downSql) {
      throw new Error(`Migration ${migration.version} does not support rollback`);
    }

    const startTime = Date.now();
    
    try {
      let rowsAffected = 0;

      await this.db.transaction(async (tx) => {
        // Execute the rollback SQL
        const statements = this.splitSqlStatements(migration.downSql!);
        
        for (const statement of statements) {
          if (statement.trim()) {
            const result = await tx.query(statement);
            rowsAffected += result.rowCount || 0;
          }
        }

        // Remove the migration record
        await tx.query(
          `DELETE FROM ${this.config.schemaTable} WHERE version = ?`,
          [migration.version]
        );
      });

      const duration = Date.now() - startTime;
      
      logger.info('Migration rollback completed successfully', {
        version: migration.version,
        duration,
        rowsAffected
      }, { component: 'MigrationRunner', action: 'executeRollback' });

      return {
        version: migration.version,
        success: true,
        duration,
        rowsAffected
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = (error as Error).message;
      
      logger.error('Migration rollback failed', {
        version: migration.version,
        error: errorMessage,
        duration
      }, { component: 'MigrationRunner', action: 'executeRollback' });

      return {
        version: migration.version,
        success: false,
        duration,
        error: errorMessage
      };
    }
  }

  // =====================================================
  // Helper Methods
  // =====================================================

  private async getPendingMigrations(targetVersion?: string): Promise<MigrationFile[]> {
    const allMigrations = await this.loadMigrationFiles();
    const appliedMigrations = await this.db.query(
      `SELECT version FROM ${this.config.schemaTable}`
    );
    
    const appliedVersions = new Set(appliedMigrations.rows.map(row => row.version));
    
    let pendingMigrations = allMigrations.filter(m => !appliedVersions.has(m.version));
    
    if (targetVersion) {
      pendingMigrations = pendingMigrations.filter(m => m.version <= targetVersion);
    }
    
    return pendingMigrations.sort((a, b) => a.version.localeCompare(b.version));
  }

  private async getMigrationByVersion(version: string): Promise<MigrationFile | null> {
    const migrations = await this.loadMigrationFiles();
    return migrations.find(m => m.version === version) || null;
  }

  private async createMigrationPlan(migrations: MigrationFile[]): Promise<MigrationPlan> {
    const estimatedDuration = migrations.length * 2000; // 2 seconds per migration estimate
    const hasBreakingChanges = migrations.some(m => 
      m.metadata.description.toLowerCase().includes('breaking') ||
      m.upSql.toLowerCase().includes('drop table') ||
      m.upSql.toLowerCase().includes('drop column')
    );
    
    const requiresDowntime = hasBreakingChanges || migrations.some(m => 
      m.upSql.toLowerCase().includes('alter table') &&
      m.upSql.toLowerCase().includes('not null')
    );

    return {
      migrations,
      totalCount: migrations.length,
      estimatedDuration,
      hasBreakingChanges,
      requiresDowntime
    };
  }

  private async validateMigrationPlan(plan: MigrationPlan): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const incompatibilities: string[] = [];

    // Check for dependency conflicts
    for (const migration of plan.migrations) {
      if (migration.metadata.dependencies) {
        for (const dep of migration.metadata.dependencies) {
          const dependencyExists = plan.migrations.some(m => m.version === dep);
          const dependencyIndex = plan.migrations.findIndex(m => m.version === dep);
          const currentIndex = plan.migrations.findIndex(m => m.version === migration.version);
          
          if (!dependencyExists) {
            errors.push(`Migration ${migration.version} depends on ${dep} which is not found`);
          } else if (dependencyIndex > currentIndex) {
            errors.push(`Migration ${migration.version} depends on ${dep} but it comes later in execution order`);
          }
        }
      }
    }

    // Check for PostgreSQL/SQLite compatibility
    const databaseType = getDatabaseManager().getAdapter().constructor.name.toLowerCase();
    for (const migration of plan.migrations) {
      if (migration.metadata.postgresqlOnly && !databaseType.includes('postgresql')) {
        incompatibilities.push(`Migration ${migration.version} is PostgreSQL-only but current database is ${databaseType}`);
      }
      if (migration.metadata.sqliteOnly && !databaseType.includes('sqlite')) {
        incompatibilities.push(`Migration ${migration.version} is SQLite-only but current database is ${databaseType}`);
      }
    }

    // Performance warnings
    if (plan.totalCount > 10) {
      warnings.push(`Large number of migrations (${plan.totalCount}) may take significant time`);
    }
    
    if (plan.requiresDowntime) {
      warnings.push('Some migrations may require application downtime');
    }

    return {
      isValid: errors.length === 0 && incompatibilities.length === 0,
      errors: errors.concat(incompatibilities),
      warnings,
      incompatibilities
    };
  }

  private async ensureMigrationTables(): Promise<void> {
    // Create schema migrations table
    await this.db.query(`
      CREATE TABLE IF NOT EXISTS ${this.config.schemaTable} (
        version VARCHAR(50) PRIMARY KEY,
        description TEXT,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        checksum VARCHAR(100)
      )
    `);

    // Create failed migrations table for tracking failures
    await this.db.query(`
      CREATE TABLE IF NOT EXISTS ${this.config.schemaTable}_failed (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        version VARCHAR(50) NOT NULL,
        description TEXT,
        error_message TEXT,
        error_stack TEXT,
        attempted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        execution_time_ms INTEGER,
        checksum VARCHAR(100)
      )
    `);

    // Create migration locks table
    await this.db.query(`
      CREATE TABLE IF NOT EXISTS ${this.config.lockTable} (
        lock_id VARCHAR(100) PRIMARY KEY,
        acquired_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        acquired_by VARCHAR(100),
        expires_at DATETIME
      )
    `);
  }

  private async acquireLock(): Promise<void> {
    const timeout = Date.now() + this.config.timeoutMs;
    
    while (Date.now() < timeout) {
      try {
        const expiresAt = new Date(Date.now() + this.config.timeoutMs).toISOString();
        
        await this.db.query(
          `INSERT INTO ${this.config.lockTable} (lock_id, acquired_by, expires_at) VALUES (?, ?, ?)`,
          [this.lockId, 'migration-runner', expiresAt]
        );
        
        this.isLocked = true;
        return;
      } catch (error) {
        // Lock already exists, wait and retry
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    throw new Error('Failed to acquire migration lock within timeout period');
  }

  private async releaseLock(): Promise<void> {
    if (this.isLocked) {
      await this.db.query(
        `DELETE FROM ${this.config.lockTable} WHERE lock_id = ?`,
        [this.lockId]
      );
      this.isLocked = false;
    }
  }

  private splitSqlStatements(sql: string): string[] {
    // Simple SQL statement splitting - doesn't handle all edge cases
    return sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt && !stmt.startsWith('--'));
  }
}

// =====================================================
// CLI Interface
// =====================================================

export async function runMigrationsCLI(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];
  
  const runner = new MigrationRunner({
    dryRun: args.includes('--dry-run'),
    validateBeforeRun: !args.includes('--skip-validation')
  });

  try {
    switch (command) {
      case 'up':
        const targetVersion = args.find(arg => arg.startsWith('--to='))?.split('=')[1];
        const results = await runner.runMigrations(targetVersion);
        .length} migrations successfully`);
        break;
        
      case 'down':
        const rollbackVersion = args[1];
        if (!rollbackVersion) {
          throw new Error('Version required for rollback');
        }
        const rollbackResult = await runner.rollbackMigration(rollbackVersion);
        break;
        
      case 'status':
        const status = await runner.getMigrationStatus();
        break;
        
      default:
        }
  } catch (error) {
    console.error('Migration failed:', (error as Error).message);
    process.exit(1);
  }
}

// Run CLI if called directly
if (require.main === module) {
  runMigrationsCLI();
}