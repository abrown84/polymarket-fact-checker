import { Router } from 'express';
import { query } from '../db.js';
import { chatComplete } from '../llm.js';
export const factCheckRouter = Router();

factCheckRouter.post('/', async (req, res) => {
  try {
    const { question } = req.body;
    if (!question) return res.status(400).json({ error: 'question required' });

    const systemPrompt = `You are a fact-checker that analyzes claims using prediction market data.\nGiven a claim or question, analyze it objectively and provide:\n1. A parsed claim summary\n2. Key factors to consider\n3. A confidence assessment\nBe concise and factual.`;

    const response = await chatComplete([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: question }
    ], { maxTokens: 500 });

    const createdAt = Date.now();
    await query(
      'INSERT INTO queries_log (question, parsed_claim, created_at) VALUES ($1, $2, $3)',
      [question, { response }, createdAt]
    );

    res.json({ question, analysis: response, createdAt });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});
