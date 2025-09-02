/**
 * Database Encryption Utilities for Xpress Ops Tower
 * Implements field-level encryption for sensitive data
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

// Get encryption key from environment or generate for development
function getEncryptionKey(): string {
  const key = process.env.DATABASE_ENCRYPTION_KEY;
  
  if (process.env.NODE_ENV === 'production' && !key) {
    throw new Error('DATABASE_ENCRYPTION_KEY environment variable is required in production');
  }
  
  if (!key) {
    console.warn('⚠️  Using development encryption key - not for production use');
    return 'dev-key-' + '0'.repeat(58); // 64 char key
  }
  
  return key;
}

const ENCRYPTION_KEY = getEncryptionKey();

/**
 * Encrypt sensitive data for database storage
 */
export function encryptField(plaintext: string): string {
  if (!plaintext) return plaintext;
  
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipher(ALGORITHM, ENCRYPTION_KEY);
    cipher.setAAD(Buffer.from('xpress-ops-tower', 'utf8'));
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    
    // Format: iv:tag:encrypted
    return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt sensitive data');
  }
}

/**
 * Decrypt sensitive data from database
 */
export function decryptField(encryptedData: string): string {
  if (!encryptedData || !encryptedData.includes(':')) {
    return encryptedData; // Return as-is if not encrypted
  }
  
  try {
    const parts = encryptedData.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }
    
    const [ivHex, tagHex, encrypted] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    
    const decipher = crypto.createDecipher(ALGORITHM, ENCRYPTION_KEY);
    decipher.setAAD(Buffer.from('xpress-ops-tower', 'utf8'));
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt sensitive data');
  }
}

/**
 * Hash sensitive data for searching (one-way)
 */
export function hashField(data: string): string {
  if (!data) return data;
  
  const salt = process.env.DATABASE_HASH_SALT || 'xpress-ops-default-salt';
  return crypto.createHash('sha256').update(data + salt).digest('hex');
}

/**
 * Database field encryption wrapper
 */
export class EncryptedField {
  private value: string;
  
  constructor(plaintext: string) {
    this.value = encryptField(plaintext);
  }
  
  toString(): string {
    return this.value;
  }
  
  decrypt(): string {
    return decryptField(this.value);
  }
  
  static fromDatabase(encryptedValue: string): EncryptedField {
    const field = Object.create(EncryptedField.prototype);
    field.value = encryptedValue;
    return field;
  }
}

/**
 * Encrypt database connection strings and sensitive config
 */
export function encryptConnectionString(connectionString: string): string {
  return encryptField(connectionString);
}

export function decryptConnectionString(encryptedConnectionString: string): string {
  return decryptField(encryptedConnectionString);
}

/**
 * Secure database configuration object
 */
export function secureDbConfig(config: any): any {
  const securedConfig = { ...config };
  
  // Encrypt sensitive fields
  if (securedConfig.password) {
    securedConfig.password = encryptField(securedConfig.password);
  }
  
  if (securedConfig.connectionString) {
    securedConfig.connectionString = encryptField(securedConfig.connectionString);
  }
  
  return securedConfig;
}

/**
 * Utility for bulk field encryption
 */
export function encryptSensitiveFields(data: Record<string, any>, sensitiveFields: string[]): Record<string, any> {
  const encrypted = { ...data };
  
  sensitiveFields.forEach(field => {
    if (encrypted[field] && typeof encrypted[field] === 'string') {
      encrypted[field] = encryptField(encrypted[field]);
    }
  });
  
  return encrypted;
}

export function decryptSensitiveFields(data: Record<string, any>, sensitiveFields: string[]): Record<string, any> {
  const decrypted = { ...data };
  
  sensitiveFields.forEach(field => {
    if (decrypted[field] && typeof decrypted[field] === 'string') {
      decrypted[field] = decryptField(decrypted[field]);
    }
  });
  
  return decrypted;
}

export default {
  encryptField,
  decryptField,
  hashField,
  EncryptedField,
  encryptConnectionString,
  decryptConnectionString,
  secureDbConfig,
  encryptSensitiveFields,
  decryptSensitiveFields
};