import { db, workflows, contacts, conversations } from "@leadsai/database";
import { eq, and } from "drizzle-orm";
import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

export class WorkflowEngine {
  /**
   * Main entry point to trigger workflows based on an event.
   */
  async trigger(tenantId: string, eventType: string, payload: any) {
    console.log(`[Workflow] Triggering event: ${eventType} for tenant: ${tenantId}`);

    // 1. Fetch active workflows for this tenant and event
    const activeWorkflows = await db.select().from(workflows)
      .where(and(
        eq(workflows.tenantId, tenantId),
        eq(workflows.triggerType, eventType),
        eq(workflows.isActive, true)
      ));

    for (const wf of activeWorkflows) {
      await this.executeWorkflow(wf, payload);
    }
  }

  private async executeWorkflow(wf: any, payload: any) {
    console.log(`[Workflow] Executing: ${wf.name}`);
    const actions = wf.actions as any[];

    for (const action of actions) {
      try {
        await this.executeAction(wf.tenantId, action, payload);
      } catch (err) {
        console.error(`[Workflow] Action failed in ${wf.name}:`, err);
      }
    }

    // Update stats
    await db.update(workflows).set({
      lastTriggeredAt: new Date(),
      // triggeredCount could be incremented here if it existed in schema
    }).where(eq(workflows.id, wf.id));
  }

  private async executeAction(tenantId: string, action: any, payload: any) {
    switch (action.type) {
      case "send_wa_message":
        await this.sendWhatsApp(tenantId, action.params.text, payload.contactId || payload.jid);
        break;
      case "add_tag":
        await this.addTag(tenantId, action.params.tag, payload.contactId);
        break;
      case "assign_agent":
        await this.assignAgent(tenantId, action.params.agentId, payload.conversationId);
        break;
      case "calculate_lead_score":
        await this.calculateLeadScore(tenantId, payload.contactId);
        break;
      default:
        console.warn(`[Workflow] Unknown action type: ${action.type}`);
    }
  }

  private async sendWhatsApp(tenantId: string, text: string, to: string) {
    // Push to WA outbound queue
    const queuePayload = {
      tenantId,
      to,
      text,
      sessionId: `${tenantId}_whatsapp` // Assuming naming convention
    };
    await redis.rpush("wa_outbound_queue", JSON.stringify(queuePayload));
  }

  private async addTag(tenantId: string, tag: string, contactId: string) {
    if (!contactId) return;
    const [contact] = await db.select().from(contacts).where(eq(contacts.id, contactId)).limit(1);
    if (contact) {
      const tags = [...(contact.tags || []), tag];
      await db.update(contacts).set({ tags: Array.from(new Set(tags)) }).where(eq(contacts.id, contactId));
    }
  }

  private async assignAgent(tenantId: string, agentId: string, conversationId: string) {
    if (!conversationId) return;
    await db.update(conversations).set({ 
      assignedAgentId: agentId,
      status: 'human_active'
    }).where(eq(conversations.id, conversationId));
  }

  private async calculateLeadScore(tenantId: string, contactId: string) {
    if (!contactId) return;
    const [contact] = await db.select().from(contacts).where(eq(contacts.id, contactId)).limit(1);
    if (!contact) return;

    let score = 0;
    
    // Simple scoring logic:
    // +10 for having email
    if (contact.email) score += 10;
    
    // +20 for specific tags
    if (contact.tags?.includes('hot-lead')) score += 20;
    if (contact.tags?.includes('premium')) score += 15;
    
    // +5 per conversation (can be complex query)
    
    await db.update(contacts).set({ leadScore: score }).where(eq(contacts.id, contactId));
    console.log(`[Workflow] Updated lead score for ${contact.name}: ${score}`);
  }
}
