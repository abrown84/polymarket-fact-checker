import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { healthRouter } from './routes/health.js';
import { marketsRouter } from './routes/markets.js';
import { factCheckRouter } from './routes/factCheck.js';
import { liveFeedRouter } from './routes/liveFeed.js';

const app = express();
const PORT = parseInt(process.env.PORT || '3004');

app.use(cors({ origin: process.env.CORS_ORIGINS?.split(',') || '*' }));
app.use(express.json());

app.use('/api/health', healthRouter);
app.use('/api/markets', marketsRouter);
app.use('/api/fact-check', factCheckRouter);
app.use('/api/live-feed', liveFeedRouter);

app.listen(PORT, '127.0.0.1', () => {
  console.log(`QuantumTruth server running on port ${PORT}`);
});
