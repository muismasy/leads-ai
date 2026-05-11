import { pgTable, uuid, varchar, text, boolean, integer, timestamp, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core';
// ============================================================
// TENANTS — Organizations / Companies using the platform
// ============================================================
export const tenants = pgTable('tenants', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 100 }).unique().notNull(),
    plan: varchar('plan', { length: 50 }).default('free').notNull(), // free, starter, pro, enterprise
    aiCreditsRemaining: integer('ai_credits_remaining').default(1000).notNull(),
    aiCreditsMonthlyLimit: integer('ai_credits_monthly_limit').default(1000).notNull(),
    settings: jsonb('settings').default({}).notNull(),
    logoUrl: text('logo_url'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
// ============================================================
// USERS — Team members within a tenant
// ============================================================
export const users = pgTable('users', {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    email: varchar('email', { length: 255 }).unique().notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    passwordHash: varchar('password_hash', { length: 255 }),
    role: varchar('role', { length: 50 }).default('agent').notNull(), // owner, admin, agent
    isOnline: boolean('is_online').default(false).notNull(),
    distributionWeight: integer('distribution_weight').default(50).notNull(),
    avatarUrl: text('avatar_url'),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
    index('idx_users_tenant').on(table.tenantId),
    index('idx_users_email').on(table.email),
]);
// ============================================================
// CONTACTS — CRM contacts (customers, leads, prospects)
// ============================================================
export const contacts = pgTable('contacts', {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    phone: varchar('phone', { length: 50 }),
    email: varchar('email', { length: 255 }),
    name: varchar('name', { length: 255 }),
    avatarUrl: text('avatar_url'),
    channel: varchar('channel', { length: 50 }).notNull(), // whatsapp, instagram, telegram, webchat, email
    channelId: varchar('channel_id', { length: 255 }).notNull(), // JID, IG user ID, TG chat ID, etc.
    tags: text('tags').array().default([]).notNull(),
    customFields: jsonb('custom_fields').default({}).notNull(),
    leadScore: integer('lead_score').default(0).notNull(),
    lifecycleStage: varchar('lifecycle_stage', { length: 50 }).default('lead').notNull(), // lead, prospect, customer, churned
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
    index('idx_contacts_tenant').on(table.tenantId),
    uniqueIndex('idx_contacts_channel_unique').on(table.tenantId, table.channel, table.channelId),
    index('idx_contacts_lifecycle').on(table.tenantId, table.lifecycleStage),
]);
// ============================================================
// CONVERSATIONS — Chat threads between contact and agent/AI
// ============================================================
export const conversations = pgTable('conversations', {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    contactId: uuid('contact_id').notNull().references(() => contacts.id, { onDelete: 'cascade' }),
    channel: varchar('channel', { length: 50 }).notNull(),
    assignedAgentId: uuid('assigned_agent_id').references(() => users.id, { onDelete: 'set null' }),
    status: varchar('status', { length: 50 }).default('ai_active').notNull(), // ai_active, needs_human, human_active, closed, snoozed
    priority: varchar('priority', { length: 20 }).default('normal').notNull(), // low, normal, high, urgent
    subject: text('subject'),
    tags: text('tags').array().default([]).notNull(),
    metadata: jsonb('metadata').default({}).notNull(),
    lastMessageAt: timestamp('last_message_at', { withTimezone: true }),
    lastMessagePreview: text('last_message_preview'),
    unreadCount: integer('unread_count').default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    closedAt: timestamp('closed_at', { withTimezone: true }),
}, (table) => [
    index('idx_conversations_tenant').on(table.tenantId),
    index('idx_conversations_contact').on(table.contactId),
    index('idx_conversations_agent').on(table.assignedAgentId),
    index('idx_conversations_status').on(table.tenantId, table.status),
    index('idx_conversations_last_msg').on(table.tenantId, table.lastMessageAt),
]);
// ============================================================
// MESSAGES — Individual messages within conversations
// ============================================================
export const messages = pgTable('messages', {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    conversationId: uuid('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
    senderType: varchar('sender_type', { length: 20 }).notNull(), // contact, agent, ai, system
    senderId: uuid('sender_id'), // users.id for agent, null for contact/ai/system
    content: text('content'),
    contentType: varchar('content_type', { length: 50 }).default('text').notNull(), // text, image, document, audio, video, template, interactive
    mediaUrl: text('media_url'),
    mediaMetadata: jsonb('media_metadata').default({}).notNull(), // { fileName, fileSize, mimeType, thumbnailUrl }
    externalMessageId: varchar('external_message_id', { length: 255 }), // Baileys msg ID, IG msg ID, etc.
    deliveryStatus: varchar('delivery_status', { length: 20 }).default('sent'), // pending, sent, delivered, read, failed
    metadata: jsonb('metadata').default({}).notNull(), // AI confidence, tool calls, etc.
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
    index('idx_messages_conversation').on(table.conversationId),
    index('idx_messages_tenant_time').on(table.tenantId, table.createdAt),
    index('idx_messages_external_id').on(table.externalMessageId),
]);
//# sourceMappingURL=core.js.map