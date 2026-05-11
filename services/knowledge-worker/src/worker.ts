import { db, knowledgeDocuments, knowledgeChunks } from "@leadsai/database";
import { eq } from "drizzle-orm";
import { chunkText, generateBatchEmbeddings } from "./utils/ai";
import axios from "axios";
import { convert as htmlToText } from "html-to-text";

export class KnowledgeWorker {
  async processDocument(documentId: string) {
    console.log(`[KnowledgeWorker] Processing document: ${documentId}`);
    
    // 1. Get document from DB
    const [doc] = await db.select().from(knowledgeDocuments).where(eq(knowledgeDocuments.id, documentId)).limit(1);
    if (!doc) throw new Error("Document not found");

    try {
      let rawText = "";

      // 2. Extract text based on source type
      if (doc.sourceType === "url" && doc.sourceUrl) {
        const response = await axios.get(doc.sourceUrl);
        rawText = htmlToText(response.data, { wordwrap: 130 });
      } else if (doc.sourceType === "faq" || doc.sourceType === "manual") {
        rawText = doc.rawContent || "";
      } else if (doc.sourceType === "file") {
        // PDF/Docx logic would go here
        rawText = doc.rawContent || ""; 
      }

      if (!rawText) throw new Error("No content found to process");

      // 3. Chunk text
      const chunks = chunkText(rawText);
      console.log(`[KnowledgeWorker] Created ${chunks.length} chunks`);

      // 4. Generate embeddings
      const embeddings = await generateBatchEmbeddings(chunks);

      // 5. Save chunks to DB
      for (let i = 0; i < chunks.length; i++) {
        const embeddingString = `[${embeddings[i].join(",")}]`;
        
        await db.insert(knowledgeChunks).values({
          documentId: doc.id,
          chunkIndex: i,
          content: chunks[i],
          embedding: embeddingString as any, // Cast to any as pgvector needs custom handling in Drizzle
          tokenCount: chunks[i].length / 4, // Rough estimate
          metadata: { charCount: chunks[i].length }
        });
      }

      // 6. Update document status
      await db.update(knowledgeDocuments).set({
        status: "ready",
        updatedAt: new Date()
      }).where(eq(knowledgeDocuments.id, doc.id));

      console.log(`[KnowledgeWorker] Document ${documentId} is READY`);

    } catch (err) {
      console.error(`[KnowledgeWorker] Error processing ${documentId}:`, err);
      await db.update(knowledgeDocuments).set({
        status: "error",
        // metadata: { error: err.message } // Add error to metadata if field exists
      }).where(eq(knowledgeDocuments.id, doc.id));
    }
  }
}
