import { Router } from 'express';
import { db, conversations, messages, contacts, deals, aiUsageLogs } from '@leadsai/database';
import { eq, and, gte, count, sql } from 'drizzle-orm';

export const analyticsRouter = Router();

// GET /api/analytics/overview
analyticsRouter.get('/overview', async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [totalConvos] = await db.select({ total: count() }).from(conversations)
      .where(eq(conversations.tenantId, tenantId));

    const [activeConvos] = await db.select({ total: count() }).from(conversations)
      .where(and(eq(conversations.tenantId, tenantId), eq(conversations.status, 'ai_active')));

    const [totalContacts] = await db.select({ total: count() }).from(contacts)
      .where(eq(contacts.tenantId, tenantId));

    const [totalDeals] = await db.select({ total: count() }).from(deals)
      .where(eq(deals.tenantId, tenantId));

    const [wonDeals] = await db.select({ total: count() }).from(deals)
      .where(and(eq(deals.tenantId, tenantId), eq(deals.stage, 'won')));

    const [aiMessages] = await db.select({ total: count() }).from(messages)
      .where(and(eq(messages.tenantId, tenantId), eq(messages.senderType, 'ai')));

    res.json({
      success: true,
      data: {
        totalConversations: totalConvos.total,
        activeConversations: activeConvos.total,
        totalContacts: totalContacts.total,
        totalDeals: totalDeals.total,
        wonDeals: wonDeals.total,
        aiMessagesHandled: aiMessages.total,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to fetch analytics' });
  }
});
