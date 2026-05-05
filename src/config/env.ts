import dotenv from 'dotenv';

dotenv.config();

export const env = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  SUPABASE_DB_URL: process.env.SUPABASE_DB_URL || '',
  JWT_SECRET: process.env.JWT_SECRET || 'default_secret_change_me',
  NODE_ENV: process.env.NODE_ENV || 'development',
};

// Quick validation
if (!env.SUPABASE_DB_URL) {
  console.error('❌ SUPABASE_DB_URL is missing in .env file');
  process.exit(1);
}

if (env.JWT_SECRET === 'default_secret_change_me' && env.NODE_ENV === 'production') {
  console.error('❌ JWT_SECRET must be changed in production');
  process.exit(1);
}

console.log('✅ Environment variables loaded');