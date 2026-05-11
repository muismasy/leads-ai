import { db, conversations, messages, aiAgents, contacts } from "@leadsai/database";
import { eq, and, desc, asc } from "drizzle-orm";
import { getGeminiReply } from "./providers/gemini";
import { searchKnowledge } from "./rag-orchestrator";
import type { NormalizedMessage, AIReplyResult } from "@leadsai/shared";

export async function processIncomingMessage(msg: NormalizedMessage): Promise<AIReplyResult> {
  const startTime = Date.now();

  // 1. Get Conversation context
  const [conv] = await db.select().from(conversations)
    .where(and(
      eq(conversations.contactId, msg.contactChannelId), // This should be resolved to the internal ID
      eq(conversations.tenantId, msg.tenantId)
    )).limit(1);

  // 2. Get AI Agent config for this tenant
  const [agent] = await db.select().from(aiAgents)
    .where(and(
      eq(aiAgents.tenantId, msg.tenantId),
      eq(aiAgents.isActive, true)
    )).limit(1);

  if (!agent) {
    throw new Error("No active AI agent found for this tenant");
  }

  // 3. Search Knowledge Base (RAG)
  const ragResults = await searchKnowledge(msg.tenantId, msg.content);
  const contextText = ragResults.map(r => `[Source: ${r.documentTitle}]\n${r.content}`).join("\n\n");

  // 4. Prepare History
  const previousMessages = await db.select().from(messages)
    .where(eq(messages.conversationId, conv?.id || ""))
    .orderBy(asc(messages.createdAt))
    .limit(10);

  const history = previousMessages.map(m => ({
    role: (m.senderType === "contact" ? "user" : "model") as "user" | "model",
    parts: [{ text: m.content || "" }]
  }));

  // 5. Build System Prompt with context
  const fullSystemPrompt = `${agent.systemPrompt}\n\nKONTeks PENGETAHUAN (Gunakan informasi ini untuk menjawab):\n${contextText}\n\nINSTRUKSI TAMBAHAN:\n- Jika Anda tidak tahu jawabannya, katakan Anda tidak tahu atau arahkan ke manusia.\n- Gunakan Bahasa Indonesia yang ramah.`;

  // 6. Get Reply from Gemini
  const geminiResponse = await getGeminiReply({
    systemPrompt: fullSystemPrompt,
    userMessage: msg.content,
    history,
    model: agent.model,
    temperature: parseFloat(agent.temperature || "0.3"),
  });

  // 7. Check for handover (simple logic for now, can be improved with tool calling)
  const needsHandover = geminiResponse.text.toLowerCase().includes("hubungi admin") || 
                        geminiResponse.text.toLowerCase().includes("panggil manusia");

  return {
    text: geminiResponse.text,
    handover: needsHandover,
    confidence: 0.9, // Mock confidence
    toolCalls: [],
    ragChunksUsed: ragResults.length,
    tokensUsed: {
      input: geminiResponse.usage?.promptTokenCount || 0,
      output: geminiResponse.usage?.candidatesTokenCount || 0
    },
    responseTimeMs: Date.now() - startTime
  };
}
