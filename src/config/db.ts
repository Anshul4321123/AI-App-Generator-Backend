import { Pool } from 'pg';
import { env } from './env';

export const pool = new Pool({
  connectionString: env.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 30000,
  keepAlive: true,
  idleTimeoutMillis: 30000,
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

export async function query(text: string, params?: any[]) {
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;

  if (env.NODE_ENV === 'development') {
    console.log('📊 Query:', { text, duration, rows: result.rowCount });
  }

  return result;
}

process.on('SIGINT', async () => {
  await pool.end();
  console.log('🔌 Database pool closed');
  process.exit(0);
});