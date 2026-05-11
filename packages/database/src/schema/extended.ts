import { pgTable, uuid, varchar, text, boolean, integer, decimal, timestamp, jsonb, index, date, customType } from 'drizzle-orm/pg-core';
import { tenants, users, contacts, conversations } from './core';

// ============================================================
// AI AGENTS — Per-tenant AI configuration
// ============================================================
export const aiAgents = pgTable('ai_agents', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).default('AI Agent').notNull(),
  systemPrompt: text('system_prompt').notNull(),
  model: varchar('model', { length: 100 }).default('gemini-2.0-flash').notNull(),
  temperature: decimal('temperature', { precision: 3, scale: 2 }).default('0.30').notNull(),
  maxTokens: integer('max_tokens').default(500).notNull(),
  toolsEnabled: text('tools_enabled').array().default([]).notNull(), // escalate, check_shipping, create_invoice, etc.
  guardrails: jsonb('guardrails').default({}).notNull(), // { forbiddenTopics, requiredDisclaimers, toneGuidelines }
  welcomeMessage: text('welcome_message'),
  fallbackMessage: text('fallback_message').default('Maaf, admin kami akan segera membantu Anda 🙏'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_ai_agents_tenant').on(table.tenantId),
]);

// ============================================================
// KNOWLEDGE DOCUMENTS — Source documents for RAG
// ============================================================
export const knowledgeDocuments = pgTable('knowledge_documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 500 }).notNull(),
  sourceType: varchar('source_type', { length: 50 }).notNull(), // file, url, faq, manual
  sourceUrl: text('source_url'),
  rawContent: text('raw_content'),
  status: varchar('status', { length: 50 }).default('processing').notNull(), // processing, ready, error, archived
  chunkCount: integer('chunk_count').default(0).notNull(),
  fileSize: integer('file_size'),
  mimeType: varchar('mime_type', { length: 100 }),
  metadata: jsonb('metadata').default({}).notNull(),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_knowledge_docs_tenant').on(table.tenantId),
  index('idx_knowledge_docs_status').on(table.tenantId, table.status),
]);

// ============================================================
// KNOWLEDGE CHUNKS — Vector embeddings for RAG search
// Note: pgvector 'vector' type handled via raw SQL migration
// ============================================================
export const knowledgeChunks = pgTable('knowledge_chunks', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  documentId: uuid('document_id').notNull().references(() => knowledgeDocuments.id, { onDelete: 'cascade' }),
  chunkIndex: integer('chunk_index').notNull(),
  content: text('content').notNull(),
  // embedding column added via raw SQL: ALTER TABLE ADD COLUMN embedding vector(768)
  tokenCount: integer('token_count'),
  metadata: jsonb('metadata').default({}).notNull(), // { heading, pageNumber, sectionTitle }
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_knowledge_chunks_tenant').on(table.tenantId),
  index('idx_knowledge_chunks_document').on(table.documentId),
]);

// ============================================================
// DEALS — Sales pipeline
// ============================================================
export const deals = pgTable('deals', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  contactId: uuid('contact_id').notNull().references(() => contacts.id, { onDelete: 'cascade' }),
  conversationId: uuid('conversation_id').references(() => conversations.id, { onDelete: 'set null' }),
  title: varchar('title', { length: 500 }).notNull(),
  value: decimal('value', { precision: 15, scale: 2 }),
  currency: varchar('currency', { length: 10 }).default('IDR').notNull(),
  stage: varchar('stage', { length: 100 }).default('new').notNull(), // new, qualified, proposal, negotiation, won, lost
  probability: integer('probability').default(10).notNull(),
  assignedTo: uuid('assigned_to').references(() => users.id, { onDelete: 'set null' }),
  expectedCloseDate: date('expected_close_date'),
  lostReason: text('lost_reason'),
  metadata: jsonb('metadata').default({}).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_deals_tenant').on(table.tenantId),
  index('idx_deals_contact').on(table.contactId),
  index('idx_deals_stage').on(table.tenantId, table.stage),
  index('idx_deals_assigned').on(table.assignedTo),
]);

// ============================================================
// CHANNEL CONNECTIONS — Connected messaging channels per tenant
// ============================================================
export const channelConnections = pgTable('channel_connections', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  channel: varchar('channel', { length: 50 }).notNull(), // whatsapp, instagram, telegram, webchat, email
  status: varchar('status', { length: 50 }).default('disconnected').notNull(), // connected, disconnected, connecting, error
  credentials: jsonb('credentials').default({}).notNull(), // encrypted session data, API tokens
  config: jsonb('config').default({}).notNull(), // business hours, auto-reply toggle, greeting message
  connectedPhone: varchar('connected_phone', { length: 50 }),
  connectedName: varchar('connected_name', { length: 255 }),
  sessionId: varchar('session_id', { length: 100 }), // WA Gateway session ID
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_channel_connections_tenant').on(table.tenantId),
  index('idx_channel_connections_session').on(table.sessionId),
]);

// ============================================================
// WORKFLOWS — Automation rules
// ============================================================
export const workflows = pgTable('workflows', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  triggerType: varchar('trigger_type', { length: 100 }).notNull(), // new_message, new_contact, tag_added, deal_stage_changed, schedule
  triggerConfig: jsonb('trigger_config').default({}).notNull(),
  actions: jsonb('actions').notNull(), // [{type, config}, ...]
  isActive: boolean('is_active').default(true).notNull(),
  lastTriggeredAt: timestamp('last_triggered_at', { withTimezone: true }),
  triggerCount: integer('trigger_count').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_workflows_tenant').on(table.tenantId),
  index('idx_workflows_trigger').on(table.tenantId, table.triggerType),
]);

// ============================================================
// AI USAGE LOG — Track AI credit consumption
// ============================================================
export const aiUsageLogs = pgTable('ai_usage_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  conversationId: uuid('conversation_id').references(() => conversations.id, { onDelete: 'set null' }),
  model: varchar('model', { length: 100 }).notNull(),
  inputTokens: integer('input_tokens').default(0).notNull(),
  outputTokens: integer('output_tokens').default(0).notNull(),
  totalTokens: integer('total_tokens').default(0).notNull(),
  creditsUsed: integer('credits_used').default(1).notNull(),
  ragChunksUsed: integer('rag_chunks_used').default(0).notNull(),
  responseTimeMs: integer('response_time_ms'),
  toolCalls: text('tool_calls').array().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_ai_usage_tenant').on(table.tenantId),
  index('idx_ai_usage_time').on(table.tenantId, table.createdAt),
]);
