import pg from 'pg';
const { Pool } = pg;
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://qtuser:qtpass2026@127.0.0.1:5432/quantumtruth'
});
export async function query(text: string, params?: any[]) {
  return pool.query(text, params);
}
