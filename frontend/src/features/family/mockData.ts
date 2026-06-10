import { FamilyMember, FamilyAlert } from '@/types';

const d = (daysAgo: number) => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date;
};

export const mockFamilyMembers: FamilyMember[] = [
  {
    id: '1',
    name: 'Rajesh Kumar',
    email: 'rajesh@example.com',
    role: 'admin',
    protectionStatus: 'protected',
    safetyScore: 88,
    joinedAt: d(120),
    deviceCount: 3,
  },
  {
    id: '2',
    name: 'Priya Kumar',
    email: 'priya@example.com',
    role: 'member',
    protectionStatus: 'at-risk',
    safetyScore: 62,
    joinedAt: d(90),
    deviceCount: 2,
  },
  {
    id: '3',
    name: 'Arjun Kumar',
    email: 'arjun@example.com',
    role: 'member',
    protectionStatus: 'protected',
    safetyScore: 91,
    joinedAt: d(45),
    deviceCount: 1,
  },
  {
    id: '4',
    name: 'Ananya Kumar',
    email: 'ananya@example.com',
    role: 'member',
    protectionStatus: 'offline',
    safetyScore: 75,
    joinedAt: d(30),
    deviceCount: 2,
  },
];

export const mockFamilyAlerts: FamilyAlert[] = [
  {
    id: '1',
    memberId: '2',
    memberName: 'Priya Kumar',
    type: 'threat',
    message: 'Opened a suspicious WhatsApp link that may be a phishing attempt.',
    severity: 'danger',
    timestamp: d(0),
    resolved: false,
  },
  {
    id: '2',
    memberId: '3',
    memberName: 'Arjun Kumar',
    type: 'scan',
    message: 'Scanned a screenshot — threat detected and blocked (Job Scam).',
    severity: 'warning',
    timestamp: d(1),
    resolved: true,
  },
  {
    id: '3',
    memberId: '4',
    memberName: 'Ananya Kumar',
    type: 'login',
    message: 'New device login detected from Mumbai, India.',
    severity: 'info',
    timestamp: d(2),
    resolved: true,
  },
];

export const mockFamilySafetyScore = 79;
