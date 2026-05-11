import "dotenv/config";
import Redis from "ioredis";
import { WorkflowEngine } from "./engine";

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");
const QUEUE_NAME = "platform_events_queue";
const engine = new WorkflowEngine();

console.log("⚡ LeadsAI Workflow Service starting...");

async function start() {
  while (true) {
    try {
      const data = await redis.blpop(QUEUE_NAME, 0);
      if (!data) continue;

      const event = JSON.parse(data[1]);
      // Event format: { tenantId: string, type: string, payload: any }
      
      await engine.trigger(event.tenantId, event.type, event.payload);
      
    } catch (err) {
      console.error("[WorkflowService] Queue error:", err);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

start();
