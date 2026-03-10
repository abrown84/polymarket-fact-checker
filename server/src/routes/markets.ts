import { Router } from 'express';
import { query } from '../db.js';
export const marketsRouter = Router();

marketsRouter.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const result = await query('SELECT * FROM markets ORDER BY volume DESC NULLS LAST LIMIT $1', [limit]);
    res.json({ markets: result.rows });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

marketsRouter.post('/ingest', async (req, res) => {
  // Placeholder — real ingest logic reads from Polymarket API
  res.json({ status: 'ok', message: 'Ingest triggered (implement Polymarket API call)' });
});
