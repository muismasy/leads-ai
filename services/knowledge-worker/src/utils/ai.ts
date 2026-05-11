import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

/**
 * Splits text into overlapping chunks.
 */
export function chunkText(text: string, chunkSize: number = 1000, overlap: number = 200): string[] {
  const chunks: string[] = [];
  let start = 0;
  
  while (start < text.length) {
    let end = start + chunkSize;
    chunks.push(text.slice(start, end));
    start += chunkSize - overlap;
  }
  
  return chunks;
}

/**
 * Generates embeddings for a list of text chunks in batches.
 */
export async function generateBatchEmbeddings(chunks: string[]) {
  const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
  
  // text-embedding-004 supports batching up to 100 texts
  const batchSize = 100;
  const allEmbeddings: number[][] = [];
  
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    const result = await model.batchEmbedContents({
      requests: batch.map(t => ({ content: { role: "user", parts: [{ text: t }] } }))
    });
    
    allEmbeddings.push(...result.embeddings.map(e => e.values));
  }
  
  return allEmbeddings;
}
