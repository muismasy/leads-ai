// ============================================================
// Normalized Message — Unified format across all channels
// ============================================================
export interface NormalizedMessage {
  tenantId: string;
  channelType: ChannelType;
  channelMessageId: string;
  contactChannelId: string;
  contactName: string;
  contentType: ContentType;
  content: string;
  mediaUrl?: string;
  metadata: Record<string, any>;
  timestamp: Date;
}

export type ChannelType = 'whatsapp' | 'instagram' | 'telegram' | 'webchat' | 'email';
export type ContentType = 'text' | 'image' | 'document' | 'audio' | 'video' | 'template' | 'interactive';
export type ConversationStatus = 'ai_active' | 'needs_human' | 'human_active' | 'closed' | 'snoozed';
export type SenderType = 'contact' | 'agent' | 'ai' | 'system';
export type DealStage = 'new' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';
export type UserRole = 'owner' | 'admin' | 'agent';
export type LifecycleStage = 'lead' | 'prospect' | 'customer' | 'churned';
export type PlanType = 'free' | 'starter' | 'pro' | 'enterprise';

// ============================================================
// API Response Types
// ============================================================
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  pagination?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ============================================================
// Auth Types
// ============================================================
export interface JwtPayload {
  userId: string;
  tenantId: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  companyName: string;
  name: string;
  email: string;
  password: string;
}

// ============================================================
// AI Engine Types
// ============================================================
export interface AIReplyResult {
  text: string;
  handover: boolean;
  confidence: number;
  toolCalls: ToolCallResult[];
  ragChunksUsed: number;
  tokensUsed: { input: number; output: number };
  responseTimeMs: number;
}

export interface ToolCallResult {
  name: string;
  args: Record<string, any>;
  result?: any;
}

export interface RAGSearchResult {
  chunkId: string;
  content: string;
  score: number;
  documentTitle: string;
  metadata: Record<string, any>;
}

// ============================================================
// WebSocket Event Types
// ============================================================
export type WSEventType =
  | 'conversation:new'
  | 'conversation:updated'
  | 'message:new'
  | 'message:status'
  | 'agent:typing'
  | 'contact:typing'
  | 'agent:online'
  | 'agent:offline';

export interface WSEvent {
  type: WSEventType;
  tenantId: string;
  payload: any;
}
