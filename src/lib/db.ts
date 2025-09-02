import { getDatabase } from './database/connection-manager';

// Get database adapter (SQLite or PostgreSQL based on environment)  
let db: any = null;

async function getDB() {
  if (!db) {
    db = getDatabase();
    // Wait a moment for SQLite initialization if needed
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  return db;
}

export async function query<T = any>(sql: string, params?: any[]): Promise<{ rows: T[] }> {
  const database = await getDB();
  const result = await database.query(sql, params);
  return { rows: result.rows as T[] };
}

// Helper for transactions
export async function transaction<T>(fn: (query: typeof query) => Promise<T>): Promise<T> {
  const database = await getDB();
  return database.transaction(async (tx) => {
    const txQuery = async <R = any>(sql: string, params?: any[]): Promise<{ rows: R[] }> => {
      const result = await tx.query(sql, params);
      return { rows: result.rows as R[] };
    };
    return fn(txQuery);
  });
}