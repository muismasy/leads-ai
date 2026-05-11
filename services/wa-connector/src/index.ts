import * as dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

import express from "express";
import { WAConnector } from "./connector";
import { db, channelConnections } from "@leadsai/database";
import { eq } from "drizzle-orm";

const app = express();
app.use(express.json());

const connector = new WAConnector();

console.log("🔌 LeadsAI WA Connector starting...");

// Auto-start active sessions from DB
async function bootSessions() {
  const activeChannels = await db.select().from(channelConnections)
    .where(eq(channelConnections.channel, "whatsapp"));
  
  console.log(`[Boot] Found ${activeChannels.length} WhatsApp channels to reconnect`);
  
  for (const channel of activeChannels) {
    if (channel.sessionId) {
      connector.connect(channel.sessionId, channel.tenantId);
    }
  }
}

// API for Gateway to trigger new connections
app.post("/connect", async (req, res) => {
  const { sessionId, tenantId } = req.body;
  if (!sessionId || !tenantId) return res.status(400).json({ error: "Missing sessionId or tenantId" });
  
  connector.connect(sessionId, tenantId);
  res.json({ success: true, message: "Connection initiated" });
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

const PORT = process.env.PORT || process.env.WA_CONNECTOR_PORT || 3001;
app.listen(PORT, async () => {
  console.log(`🚀 WA Connector listening on port ${PORT}`);
  await bootSessions();
});
