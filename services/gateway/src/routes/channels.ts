import { Router } from 'express';
import { db, channelConnections } from '@leadsai/database';
import { eq, and } from 'drizzle-orm';

export const channelsRouter = Router();

// GET /api/channels
channelsRouter.get('/', async (req, res) => {
  try {
    const results = await db.select().from(channelConnections)
      .where(eq(channelConnections.tenantId, req.user!.tenantId));
    // Strip credentials from response
    const safe = results.map(({ credentials, ...rest }) => rest);
    res.json({ success: true, data: safe });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to fetch channels' });
  }
});

// POST /api/channels — Add new channel connection
channelsRouter.post('/', async (req, res) => {
  try {
    const { channel, config } = req.body;
    const [conn] = await db.insert(channelConnections).values({
      tenantId: req.user!.tenantId,
      channel,
      status: 'disconnected',
      config: config || {},
      sessionId: `${req.user!.tenantId}_${channel}_${Date.now()}`,
    }).returning();
    res.status(201).json({ success: true, data: conn });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to add channel' });
  }
});

// POST /api/channels/:id/connect — Trigger channel connection (e.g., start WA QR)
channelsRouter.post('/:id/connect', async (req, res) => {
  try {
    const [conn] = await db.select().from(channelConnections)
      .where(and(eq(channelConnections.id, req.params.id), eq(channelConnections.tenantId, req.user!.tenantId)))
      .limit(1);
    if (!conn) return res.status(404).json({ success: false, error: 'Not found' });

    // Send connect request to wa-connector service via HTTP
    const connectorUrl = process.env.WA_CONNECTOR_URL || 'http://localhost:3001';
    const response = await fetch(`${connectorUrl}/connect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: conn.sessionId,
        tenantId: req.user!.tenantId
      })
    });

    if (!response.ok) {
      throw new Error('Failed to communicate with WA Connector');
    }

    await db.update(channelConnections).set({ status: 'connecting', updatedAt: new Date() })
      .where(eq(channelConnections.id, req.params.id));

    res.json({ success: true, message: 'Connection initiated', sessionId: conn.sessionId });
  } catch (err: any) {
    console.error('[Channels] Connect error:', err);
    res.status(500).json({ success: false, error: 'Failed to connect channel' });
  }
});

// DELETE /api/channels/:id
channelsRouter.delete('/:id', async (req, res) => {
  try {
    const [deleted] = await db.delete(channelConnections)
      .where(and(eq(channelConnections.id, req.params.id), eq(channelConnections.tenantId, req.user!.tenantId)))
      .returning();
    if (!deleted) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, message: 'Channel removed' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to delete channel' });
  }
});
