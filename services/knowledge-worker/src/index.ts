import "dotenv/config";
import Redis from "ioredis";
import { KnowledgeWorker } from "./worker";

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");
const QUEUE_NAME = "knowledge_ingestion_queue";
const worker = new KnowledgeWorker();

console.log("📚 LeadsAI Knowledge Worker starting...");

async function start() {
  while (true) {
    try {
      const data = await redis.blpop(QUEUE_NAME, 0);
      if (!data) continue;

      const payload = JSON.parse(data[1]);
      await worker.processDocument(payload.documentId);
      
    } catch (err) {
      console.error("[KnowledgeWorker] Queue error:", err);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

start();
