// ============================================================
// CyberDaddy — Shared Types
// ============================================================

export type MessageRole = 'user' | 'assistant' | 'system';

export interface Attachment {
  id: string;
  type: 'image';
  url: string; // base64 data URL or object URL
  name: string;
  size: number;
}

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  attachments?: Attachment[];
  metadata?: {
    riskScore?: RiskScore;
    command?: SlashCommand;
    component?: 'pricing' | 'dashboard-preview' | 'help';
    scanId?: string;
  };
}

export interface RiskScore {
  score: number; // 0-100
  level: 'safe' | 'low' | 'medium' | 'high' | 'critical';
  category: string;
  explanation: string;
  flags: string[];
}

export type SlashCommand =
  | '/help'
  | '/pay'
  | '/dashboard'
  | '/profile'
  | '/family'
  | '/scan'
  | '/history'
  | '/settings';

// ─── Dashboard ────────────────────────────────────────────

export interface DashboardStats {
  safetyScore: number;
  threatsDetected: number;
  familyMembersProtected: number;
  activeSubscription: SubscriptionTier;
  recentScans: Scan[];
  aiInsights: AiInsight[];
  riskTrend: RiskTrendPoint[];
}

export type SubscriptionTier = 'Free' | 'Pro' | 'Family' | 'Enterprise';

// Updated Scan type to support both backend-mapped and legacy usage
export interface Scan {
  id: string;
  timestamp: Date;
  fileName: string;
  // riskScore can be the legacy number format OR the full RiskScore object
  riskScore: number | RiskScore;
  riskLevel: RiskScore['level'];
  category: string;
  status: 'completed' | 'pending' | 'failed' | 'safe' | 'threat' | 'analyzing';
}

export interface AiInsight {
  id: string;
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'danger';
  timestamp: Date;
}

export interface RiskTrendPoint {
  date: string;
  score: number;
  threats: number;
}

// ─── Family ───────────────────────────────────────────────

export interface FamilyMember {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'admin' | 'member';
  protectionStatus: 'protected' | 'at-risk' | 'offline';
  safetyScore: number;
  joinedAt: Date;
  deviceCount: number;
}

export interface FamilyAlert {
  id: string;
  memberId: string;
  memberName: string;
  type: 'threat' | 'scan' | 'device' | 'login';
  message: string;
  severity: 'info' | 'warning' | 'danger';
  timestamp: Date;
  resolved: boolean;
}

// ─── Profile ──────────────────────────────────────────────

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  safetyScore: number;
  subscription: SubscriptionTier;
  accountStatus: 'active' | 'suspended' | 'trial';
  protectedSince: Date;
  totalScans: number;
  threatsBlocked: number;
}

// ─── Payments ─────────────────────────────────────────────

export interface PricingPlan {
  id: SubscriptionTier;
  name: string;
  price: number; // INR/month
  priceUSD: number;
  description: string;
  features: string[];
  highlighted: boolean;
  badge?: string;
  maxMembers: number;
}

// ─── Groq ─────────────────────────────────────────────────

export interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | GroqContentPart[];
}

export interface GroqContentPart {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: { url: string };
}
