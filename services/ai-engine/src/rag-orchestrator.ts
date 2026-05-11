import { db, knowledgeChunks, knowledgeDocuments } from "@leadsai/database";
import { sql, and, eq } from "drizzle-orm";
import { generateEmbeddings } from "./providers/gemini";

export interface SearchResult {
  content: string;
  score: number;
  metadata: any;
  documentTitle: string;
}

export async function searchKnowledge(tenantId: string, query: string, limit: number = 5): Promise<SearchResult[]> {
  const embedding = await generateEmbeddings(query);
  const vectorString = `[${embedding.join(",")}]`;

  // Use cosine similarity (1 - cosine distance)
  // cosine distance <=> <=> in pgvector
  const results = await db.execute(sql`
    SELECT 
      chunks.content,
      chunks.metadata,
      docs.title as documentTitle,
      1 - (chunks.embedding <=> ${vectorString}::vector) as score
    FROM ${knowledgeChunks} as chunks
    JOIN ${knowledgeDocuments} as docs ON chunks.document_id = docs.id
    WHERE docs.tenant_id = ${tenantId} AND docs.status = 'ready'
    ORDER BY chunks.embedding <=> ${vectorString}::vector
    LIMIT ${limit}
  `);

  return (results.rows as any[]).map(row => ({
    content: row.content,
    score: parseFloat(row.score),
    metadata: row.metadata,
    documentTitle: row.documenttitle,
  }));
}
