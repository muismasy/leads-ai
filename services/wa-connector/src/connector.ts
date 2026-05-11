import makeWASocket, { 
  DisconnectReason, 
  useMultiFileAuthState, 
  fetchLatestBaileysVersion, 
  makeCacheableSignalKeyStore,
  delay
} from "@whiskeysockets/baileys";
import { pino } from "pino";
import Redis from "ioredis";
import { useRedisAuthState } from "./utils/redis-auth";
import { db, channelConnections, conversations, messages, contacts } from "@leadsai/database";
import { eq, and } from "drizzle-orm";

const logger = pino({ level: "silent" });

export class WAConnector {
  private sessions = new Map<string, any>();
  private redis: Redis;

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");
    this.listenForOutboundMessages();
  }

  async connect(sessionId: string, tenantId: string) {
    if (this.sessions.has(sessionId)) return;

    console.log(`[WA-${sessionId}] Initializing session...`);
    const { state, saveCreds } = await useRedisAuthState(this.redis, sessionId);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
      version,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger),
      },
      printQRInTerminal: false,
      logger,
      browser: ["LeadsAI", "Chrome", "110.0.0"],
    });

    this.sessions.set(sessionId, sock);

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        // Save QR to DB for the dashboard to pick up
        await db.update(channelConnections)
          .set({ metadata: { qr }, status: "waiting_qr" })
          .where(eq(channelConnections.sessionId, sessionId));
      }

      if (connection === "close") {
        const shouldReconnect = (lastDisconnect?.error as any)?.output?.statusCode !== DisconnectReason.loggedOut;
        console.log(`[WA-${sessionId}] Connection closed. Reconnect: ${shouldReconnect}`);
        this.sessions.delete(sessionId);
        if (shouldReconnect) this.connect(sessionId, tenantId);
        
        await db.update(channelConnections)
          .set({ status: "disconnected" })
          .where(eq(channelConnections.sessionId, sessionId));
      } else if (connection === "open") {
        console.log(`[WA-${sessionId}] Connected successfully!`);
        await db.update(channelConnections)
          .set({ status: "connected", metadata: { qr: null } })
          .where(eq(channelConnections.sessionId, sessionId));
      }
    });

    sock.ev.on("messages.upsert", async (m) => {
      const msg = m.messages[0];
      if (!msg.message || msg.key.fromMe) return;
      if (msg.key.remoteJid?.endsWith("@g.us")) return; // Skip groups for now

      const jid = msg.key.remoteJid!;
      const text = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
      const pushName = msg.pushName || "WhatsApp User";

      console.log(`[WA-${sessionId}] Incoming: ${text} from ${jid}`);

      // 1. Ensure contact exists
      let [contact] = await db.select().from(contacts)
        .where(and(eq(contacts.channelId, jid), eq(contacts.tenantId, tenantId)))
        .limit(1);

      if (!contact) {
        [contact] = await db.insert(contacts).values({
          tenantId,
          name: pushName,
          channel: "whatsapp",
          channelId: jid,
          lifecycleStage: "lead",
        }).returning();
      }

      // 2. Ensure conversation exists
      let [conv] = await db.select().from(conversations)
        .where(and(eq(conversations.contactId, contact.id), eq(conversations.tenantId, tenantId)))
        .limit(1);

      if (!conv) {
        [conv] = await db.insert(conversations).values({
          tenantId,
          contactId: contact.id,
          channel: "whatsapp",
          status: "ai_active",
          lastMessagePreview: text.substring(0, 100),
        }).returning();
      }

      // 3. Save message
      const [newMsg] = await db.insert(messages).values({
        tenantId,
        conversationId: conv.id,
        senderType: "contact",
        content: text,
        contentType: "text",
      }).returning();

      // 4. Update conversation
      const [updatedConv] = await db.update(conversations).set({
        lastMessageAt: new Date(),
        lastMessagePreview: text.substring(0, 100),
        unreadCount: (conv.unreadCount || 0) + 1,
      }).where(eq(conversations.id, conv.id)).returning();

      // 5. Real-time broadcast to agents via Gateway
      await this.redis.publish("socket_broadcast", JSON.stringify({
        target: "tenant",
        targetId: tenantId,
        event: "message:new",
        data: newMsg
      }));

      await this.redis.publish("socket_broadcast", JSON.stringify({
        target: "tenant",
        targetId: tenantId,
        event: "conversation:updated",
        data: updatedConv
      }));

      // 6. Push to AI Engine queue if AI is enabled
      await this.redis.rpush("ai_message_queue", JSON.stringify({
        tenantId,
        conversationId: conv.id,
        contactId: contact.id,
        contactChannelId: jid,
        content: text,
        timestamp: new Date(),
      }));
    });
  }

  private async listenForOutboundMessages() {
    const OUTBOUND_QUEUE = "wa_outbound_queue";
    while (true) {
      try {
        const data = await this.redis.blpop(OUTBOUND_QUEUE, 0);
        if (!data) continue;

        const payload = JSON.parse(data[1]);
        const sock = this.sessions.get(payload.sessionId);

        if (sock && payload.to && payload.text) {
          console.log(`[WA-Outbound] Sending to ${payload.to}`);
          await sock.sendMessage(payload.to, { text: payload.text });
        }
      } catch (err) {
        console.error("[WA-Outbound] Error:", err);
        await delay(1000);
      }
    }
  }
}
