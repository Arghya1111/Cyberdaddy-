import { DashboardStats, Scan, AiInsight, RiskTrendPoint } from '@/types';

const generateDate = (daysAgo: number) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d;
};

export const mockRecentScans: Scan[] = [
  {
    id: '1',
    timestamp: generateDate(0),
    fileName: 'bank_sms.png',
    riskScore: 92,
    riskLevel: 'critical',
    category: 'Phishing',
    status: 'completed',
  },
  {
    id: '2',
    timestamp: generateDate(1),
    fileName: 'lottery_email.jpg',
    riskScore: 78,
    riskLevel: 'high',
    category: 'Scam',
    status: 'completed',
  },
  {
    id: '3',
    timestamp: generateDate(2),
    fileName: 'whatsapp_offer.png',
    riskScore: 45,
    riskLevel: 'medium',
    category: 'Social Engineering',
    status: 'completed',
  },
  {
    id: '4',
    timestamp: generateDate(3),
    fileName: 'amazon_receipt.png',
    riskScore: 12,
    riskLevel: 'safe',
    category: 'Legitimate',
    status: 'completed',
  },
  {
    id: '5',
    timestamp: generateDate(5),
    fileName: 'job_offer.pdf.png',
    riskScore: 65,
    riskLevel: 'high',
    category: 'Job Scam',
    status: 'completed',
  },
];

export const mockAiInsights: AiInsight[] = [
  {
    id: '1',
    title: 'New Phishing Campaign Detected',
    description: 'A new SBI Bank phishing campaign is circulating on WhatsApp targeting Indian users.',
    severity: 'danger',
    timestamp: generateDate(0),
  },
  {
    id: '2',
    title: 'Your Safety Score Improved',
    description: 'Great job! Your security habits have improved your safety score by 8 points this week.',
    severity: 'info',
    timestamp: generateDate(1),
  },
  {
    id: '3',
    title: 'Family Member at Risk',
    description: 'Priya may have opened a suspicious link. Review the shared alert.',
    severity: 'warning',
    timestamp: generateDate(1),
  },
];

export const mockRiskTrend: RiskTrendPoint[] = [
  { date: 'Jun 1', score: 72, threats: 3 },
  { date: 'Jun 2', score: 68, threats: 5 },
  { date: 'Jun 3', score: 75, threats: 2 },
  { date: 'Jun 4', score: 80, threats: 1 },
  { date: 'Jun 5', score: 78, threats: 2 },
  { date: 'Jun 6', score: 85, threats: 0 },
  { date: 'Jun 7', score: 88, threats: 1 },
  { date: 'Jun 8', score: 84, threats: 2 },
];

export const mockDashboardStats: DashboardStats = {
  safetyScore: 84,
  threatsDetected: 14,
  familyMembersProtected: 4,
  activeSubscription: 'Family',
  recentScans: mockRecentScans,
  aiInsights: mockAiInsights,
  riskTrend: mockRiskTrend,
};
