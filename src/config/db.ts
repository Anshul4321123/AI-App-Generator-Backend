import { Pool } from 'pg';
import { env } from './env';

// Log the connection attempt (without password)
const sanitizedUrl = env.SUPABASE_DB_URL?.replace(/:[^:@]*@/, ':***@');
console.log('🔌 Attempting to connect to:', sanitizedUrl);

export const pool = new Pool({
  connectionString: env.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false }, // Important for Supabase
  connectionTimeoutMillis: 30000, // Increase timeout to 30 seconds
  keepAlive: true,
  idleTimeoutMillis: 30000,
});

// Test connection on startup with better error handling
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
    console.error('📋 Full error details:', err);
    console.error('💡 Check that:');
    console.error('   1. SUPABASE_DB_URL is correct in environment variables');
    console.error('   2. Database password is correct');
    console.error('   3. Supabase allows external connections');
    console.error('   4. You are NOT running locally with production URL');
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