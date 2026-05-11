import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function getGeminiReply(params: {
  systemPrompt: string;
  userMessage: string;
  history: { role: "user" | "model"; parts: { text: string }[] }[];
  model?: string;
  temperature?: number;
  tools?: any[];
}) {
  const modelName = params.model || "gemini-2.0-flash";
  const generativeModel = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: params.systemPrompt,
    generationConfig: {
      temperature: params.temperature ?? 0.3,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 1024,
    },
    safetySettings: [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
    ],
  });

  const chat = generativeModel.startChat({
    history: params.history,
  });

  const result = await chat.sendMessage(params.userMessage);
  const response = result.response;
  
  return {
    text: response.text(),
    usage: response.usageMetadata,
    candidates: response.candidates,
  };
}

export async function generateEmbeddings(text: string) {
  const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
  const result = await model.embedContent(text);
  return result.embedding.values;
}
