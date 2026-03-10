import { Router } from 'express';
import { query } from '../db.js';
export const liveFeedRouter = Router();

liveFeedRouter.get('/', async (req, res) => {
  try {
    const markets = await query('SELECT * FROM markets ORDER BY last_ingested_at DESC LIMIT 20');
    const prices = await query('SELECT * FROM realtime_prices ORDER BY last_updated DESC LIMIT 50');
    res.json({ markets: markets.rows, prices: prices.rows });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});
