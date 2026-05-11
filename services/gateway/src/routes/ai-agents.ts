import { Router } from 'express';
import { db, aiAgents } from '@leadsai/database';
import { eq, and } from 'drizzle-orm';

export const aiAgentsRouter = Router();

// GET /api/ai-agents
aiAgentsRouter.get('/', async (req, res) => {
  try {
    const results = await db.select().from(aiAgents)
      .where(eq(aiAgents.tenantId, req.user!.tenantId));
    res.json({ success: true, data: results });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to fetch AI agents' });
  }
});

// POST /api/ai-agents
aiAgentsRouter.post('/', async (req, res) => {
  try {
    const { name, systemPrompt, model, temperature, maxTokens, toolsEnabled, guardrails, welcomeMessage, fallbackMessage } = req.body;
    const [agent] = await db.insert(aiAgents).values({
      tenantId: req.user!.tenantId,
      name: name || 'AI Agent',
      systemPrompt: systemPrompt || 'Anda adalah asisten AI yang ramah.',
      model: model || 'gemini-2.0-flash',
      temperature: temperature || '0.30',
      maxTokens: maxTokens || 500,
      toolsEnabled: toolsEnabled || ['escalate_to_human'],
      guardrails: guardrails || {},
      welcomeMessage,
      fallbackMessage,
    }).returning();
    res.status(201).json({ success: true, data: agent });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to create AI agent' });
  }
});

// PATCH /api/ai-agents/:id
aiAgentsRouter.patch('/:id', async (req, res) => {
  try {
    const updates: any = { updatedAt: new Date() };
    const fields = ['name', 'systemPrompt', 'model', 'temperature', 'maxTokens', 'toolsEnabled', 'guardrails', 'welcomeMessage', 'fallbackMessage', 'isActive'];
    for (const f of fields) {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    }
    const [updated] = await db.update(aiAgents).set(updates)
      .where(and(eq(aiAgents.id, req.params.id), eq(aiAgents.tenantId, req.user!.tenantId)))
      .returning();
    if (!updated) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to update AI agent' });
  }
});
