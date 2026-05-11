import { Router } from "express";
import Redis from "ioredis";

export const webhooksRouter = Router();
const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

/**
 * Generic Webhook Handler for Instagram, Telegram, etc.
 * Normalizes messages and pushes to the platform event queue.
 */
webhooksRouter.post("/:channel", async (req, res) => {
  const { channel } = req.params;
  const payload = req.body;

  console.log(`[Webhook] Received ${channel} event`);

  // TODO: Add channel-specific normalization logic
  // For now, just log and acknowledge
  
  res.json({ success: true });
});

/**
 * WhatsApp Webhook (Meta API version - optional)
 * We primarily use the wa-connector (Baileys) but this is here for future-proofing.
 */
webhooksRouter.get("/whatsapp", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});
