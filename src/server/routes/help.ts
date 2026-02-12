import { Router, type Request, type Response } from 'express';
import { getRawDb } from '../../db/client.js';
import { info } from '../../utils/logger.js';

const router = Router();

/** POST /api/help/questions — Submit a new question */
router.post('/api/help/questions', async (req: Request, res: Response) => {
  try {
    const db = await getRawDb();
    const { question, asked_by, category } = req.body;

    if (!question || typeof question !== 'string' || !question.trim()) {
      res.status(400).json({ error: 'question is required' });
      return;
    }

    const result = db.prepare(
      `INSERT INTO help_questions (question, asked_by, category) VALUES (?, ?, ?)`
    ).run(question.trim(), asked_by || null, category || null);

    info(`[Help] New question submitted: "${question.trim().slice(0, 60)}..."`);

    const created = db.prepare(`SELECT * FROM help_questions WHERE id = ?`).get(result.lastInsertRowid);
    res.status(201).json({ ok: true, question: created });
  } catch (err) {
    res.status(500).json({ error: 'Failed to submit question', detail: String(err) });
  }
});

/** GET /api/help/questions — List all questions (admin, supports ?status= filter) */
router.get('/api/help/questions', async (req: Request, res: Response) => {
  try {
    const db = await getRawDb();
    const status = (req.query.status as string || '').trim();

    let questions;
    if (status) {
      questions = db.prepare(
        `SELECT * FROM help_questions WHERE status = ? ORDER BY created_at DESC`
      ).all(status);
    } else {
      questions = db.prepare(
        `SELECT * FROM help_questions ORDER BY created_at DESC`
      ).all();
    }

    res.json({ data: questions, total: questions.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch questions', detail: String(err) });
  }
});

/** GET /api/help/questions/:id — Get single question */
router.get('/api/help/questions/:id', async (req: Request, res: Response) => {
  try {
    const db = await getRawDb();
    const id = req.params.id;
    const question = db.prepare(`SELECT * FROM help_questions WHERE id = ?`).get(id);

    if (!question) {
      res.status(404).json({ error: 'Question not found' });
      return;
    }

    res.json(question);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch question', detail: String(err) });
  }
});

/** PUT /api/help/questions/:id — Update question (answer, status, category) */
router.put('/api/help/questions/:id', async (req: Request, res: Response) => {
  try {
    const db = await getRawDb();
    const id = req.params.id;
    const { answer, status, category, answered_by } = req.body;

    // Build dynamic SET clause
    const updates: string[] = [];
    const params: unknown[] = [];

    if (answer !== undefined) {
      updates.push('answer = ?');
      params.push(answer);
    }
    if (status !== undefined) {
      const validStatuses = ['pending', 'answered', 'published', 'archived'];
      if (!validStatuses.includes(status)) {
        res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
        return;
      }
      updates.push('status = ?');
      params.push(status);
    }
    if (category !== undefined) {
      updates.push('category = ?');
      params.push(category);
    }
    if (answered_by !== undefined) {
      updates.push('answered_by = ?');
      params.push(answered_by);
    }

    if (updates.length === 0) {
      res.status(400).json({ error: 'No fields to update' });
      return;
    }

    updates.push("updated_at = datetime('now')");
    params.push(id);

    const result = db.prepare(
      `UPDATE help_questions SET ${updates.join(', ')} WHERE id = ?`
    ).run(...params);

    if (result.changes === 0) {
      res.status(404).json({ error: 'Question not found' });
      return;
    }

    const updated = db.prepare(`SELECT * FROM help_questions WHERE id = ?`).get(id);
    info(`[Help] Question ${id} updated: ${updates.filter(u => !u.startsWith('updated_at')).join(', ')}`);
    res.json({ ok: true, question: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update question', detail: String(err) });
  }
});

/** DELETE /api/help/questions/:id — Delete a question */
router.delete('/api/help/questions/:id', async (req: Request, res: Response) => {
  try {
    const db = await getRawDb();
    const id = req.params.id;

    const result = db.prepare(`DELETE FROM help_questions WHERE id = ?`).run(id);

    if (result.changes === 0) {
      res.status(404).json({ error: 'Question not found' });
      return;
    }

    info(`[Help] Question ${id} deleted`);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete question', detail: String(err) });
  }
});

/** GET /api/help/faq — Get published Q&A pairs (public endpoint) */
router.get('/api/help/faq', async (_req: Request, res: Response) => {
  try {
    const db = await getRawDb();
    const faq = db.prepare(
      `SELECT id, question, answer, category, updated_at FROM help_questions WHERE status = 'published' ORDER BY category, created_at DESC`
    ).all();

    res.json({ data: faq, total: faq.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch FAQ', detail: String(err) });
  }
});

export default router;
