import * as dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

import Redis from "ioredis";
import { processIncomingMessage } from "./orchestrator";
import { db, messages, conversations, aiUsageLogs, tenants } from "@leadsai/database";
import { eq, sql } from "drizzle-orm";

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");
const QUEUE_NAME = "ai_message_queue";

console.log("🤖 LeadsAI AI Engine starting...");

async function startWorker() {
  while (true) {
    try {
      // Blocking pop from the queue
      const data = await redis.blpop(QUEUE_NAME, 0);
      if (!data) continue;

      const [_queue, payloadString] = data;
      const payload = JSON.parse(payloadString);

      console.log(`[AI Engine] Processing message for tenant: ${payload.tenantId}`);

      const result = await processIncomingMessage(payload);

      // Save AI reply to DB
      const [aiMsg] = await db.insert(messages).values({
        tenantId: payload.tenantId,
        conversationId: payload.conversationId,
        senderType: "ai",
        content: result.text,
        contentType: "text",
        metadata: {
          ragChunksUsed: result.ragChunksUsed,
          tokensUsed: result.tokensUsed,
          responseTimeMs: result.responseTimeMs
        }
      }).returning();

      // Update conversation
      const [updatedConv] = await db.update(conversations).set({
        lastMessageAt: new Date(),
        lastMessagePreview: result.text.substring(0, 100),
        status: result.handover ? "needs_human" : "ai_active"
      }).where(eq(conversations.id, payload.conversationId)).returning();

      // Log AI Usage
      await db.insert(aiUsageLogs).values({
        tenantId: payload.tenantId,
        agentId: payload.agentId || 'default',
        conversationId: payload.conversationId,
        model: 'gemini-2.0-flash',
        promptTokens: result.tokensUsed.input,
        completionTokens: result.tokensUsed.output,
        totalTokens: result.tokensUsed.input + result.tokensUsed.output,
        estimatedCost: '0', // Can be calculated based on pricing
      });

      // Deduct credits from tenant (1 credit per 1000 tokens for example)
      const creditsToDeduct = Math.ceil((result.tokensUsed.input + result.tokensUsed.output) / 100);
      await db.execute(sql`
        UPDATE ${tenants} 
        SET ai_credits_remaining = ai_credits_remaining - ${creditsToDeduct}
        WHERE id = ${payload.tenantId}
      `);

      // Real-time broadcast
      await redis.publish("socket_broadcast", JSON.stringify({
        target: "tenant",
        targetId: payload.tenantId,
        event: "message:new",
        data: aiMsg
      }));

      await redis.publish("socket_broadcast", JSON.stringify({
        target: "tenant",
        targetId: payload.tenantId,
        event: "conversation:updated",
        data: updatedConv
      }));

      console.log(`[AI Engine] Replied successfully to ${payload.tenantId}`);

    } catch (err) {
      console.error("[AI Engine] Error in worker:", err);
      // Wait a bit before retrying to avoid tight loops on constant error
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

import express from "express";

const app = express();
app.get("/health", (req, res) => res.json({ status: "ok" }));
const PORT = process.env.PORT || process.env.AI_ENGINE_PORT || 3002;
app.listen(PORT, () => console.log(`🚀 AI Engine Health Check on port ${PORT}`));

startWorker();
