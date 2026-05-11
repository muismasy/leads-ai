import { Router } from 'express';
import { db, knowledgeDocuments, knowledgeChunks } from '@leadsai/database';
import { eq, and, desc, count } from 'drizzle-orm';
import { z } from 'zod';

export const knowledgeRouter = Router();

// GET /api/knowledge
knowledgeRouter.get('/', async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    const conditions = [eq(knowledgeDocuments.tenantId, tenantId)];
    const results = await db.select().from(knowledgeDocuments)
      .where(and(...conditions)).orderBy(desc(knowledgeDocuments.createdAt));
    res.json({ success: true, data: results });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to fetch documents' });
  }
});

// POST /api/knowledge
knowledgeRouter.post('/', async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    const { title, sourceType, sourceUrl, rawContent } = req.body;
    const [doc] = await db.insert(knowledgeDocuments).values({
      tenantId, title, sourceType, sourceUrl, rawContent, status: 'processing',
    }).returning();
    res.status(201).json({ success: true, data: doc });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to create document' });
  }
});

// DELETE /api/knowledge/:id
knowledgeRouter.delete('/:id', async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    const [deleted] = await db.delete(knowledgeDocuments)
      .where(and(eq(knowledgeDocuments.id, req.params.id), eq(knowledgeDocuments.tenantId, tenantId)))
      .returning();
    if (!deleted) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, message: 'Deleted' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to delete' });
  }
});
