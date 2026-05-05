import { Pool } from 'pg';
import { env } from './env';

// Create connection pool
export const pool = new Pool({
  connectionString: env.SUPABASE_DB_URL,
  ssl: env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20, // Max connections in pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection on startup
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
    process.exit(1);
  }
  console.log('✅ Connected to PostgreSQL (Supabase)');
  release();
});

// Helper function for queries
export async function query(text: string, params?: any[]) {
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;
  
  if (env.NODE_ENV === 'development') {
    console.log('📊 Query:', { text, duration, rows: result.rowCount });
  }
  
  return result;
}

// Graceful shutdown
process.on('SIGINT', async () => {
  await pool.end();
  console.log('🔌 Database pool closed');
  process.exit(0);
});