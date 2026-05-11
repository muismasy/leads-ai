export * from './types';

// ============================================================
// Constants
// ============================================================
export const PLAN_LIMITS = {
  free: { aiCredits: 500, agents: 2, channels: 1, knowledgeDocs: 5 },
  starter: { aiCredits: 5000, agents: 5, channels: 3, knowledgeDocs: 50 },
  pro: { aiCredits: 25000, agents: 15, channels: 5, knowledgeDocs: 200 },
  enterprise: { aiCredits: -1, agents: -1, channels: -1, knowledgeDocs: -1 }, // unlimited
} as const;

export const DEAL_STAGES = [
  { value: 'new', label: 'Lead Baru', probability: 10, color: '#6B7280' },
  { value: 'qualified', label: 'Qualified', probability: 30, color: '#3B82F6' },
  { value: 'proposal', label: 'Proposal', probability: 50, color: '#F59E0B' },
  { value: 'negotiation', label: 'Negosiasi', probability: 70, color: '#8B5CF6' },
  { value: 'won', label: 'Won ✅', probability: 100, color: '#10B981' },
  { value: 'lost', label: 'Lost ❌', probability: 0, color: '#EF4444' },
] as const;

export const CHANNEL_CONFIG = {
  whatsapp: { label: 'WhatsApp', icon: '💬', color: '#25D366' },
  instagram: { label: 'Instagram', icon: '📸', color: '#E4405F' },
  telegram: { label: 'Telegram', icon: '✈️', color: '#0088CC' },
  webchat: { label: 'Live Chat', icon: '🌐', color: '#6366F1' },
  email: { label: 'Email', icon: '📧', color: '#F59E0B' },
} as const;
