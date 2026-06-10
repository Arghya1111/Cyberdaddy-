import { UserProfile } from '@/types';

export const mockUserProfile: UserProfile = {
  id: 'usr_001',
  name: 'Rajesh Kumar',
  email: 'rajesh.kumar@gmail.com',
  safetyScore: 88,
  subscription: 'Family',
  accountStatus: 'active',
  protectedSince: new Date('2025-06-15'),
  totalScans: 47,
  threatsBlocked: 14,
};
