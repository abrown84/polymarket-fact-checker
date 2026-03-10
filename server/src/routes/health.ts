import { Router } from 'express';
import { pool } from '../db.js';
export const healthRouter = Router();
healthRouter.get('/', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected', ts: Date.now() });
  } catch (e) {
    res.status(500).json({ status: 'error', db: 'disconnected' });
  }
});
