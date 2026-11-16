const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL орта айнымалысы орнатылмаған');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  options: '-c search_path=practice6',
  // Жергілікті PostgreSQL үшін DATABASE_SSL=disable орнатылады.
  ssl: process.env.DATABASE_SSL === 'disable' ? false : { rejectUnauthorized: true },
  connectionTimeoutMillis: 5000,
  max: 5
});

// Құпия қосылым жолын және толық қате хабарламасын журналға шығармаймыз.
pool.on('error', (error) => console.error('DB_POOL_ERROR', error.code || 'UNKNOWN'));
module.exports = pool;
