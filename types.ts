export enum VisibilityMode {
  ANON_COUNT = 'ANON_COUNT',
  MUTUAL_ONLY = 'MUTUAL_ONLY',
  REVEAL_AFTER_PERIOD = 'REVEAL_AFTER_PERIOD'
}

export interface UserProfile {
  uid: string;
  instagramId: string | null;
  displayName: string | null;
  photoURL: string | null;
  isAdmin?: boolean;
  handle?: string; // @username
  createdAt: number;
}

export interface Period {
  id: string;
  name: string; // e.g. "Valentine's Week 2024"
  startAt: number; // timestamp
  endAt: number; // timestamp
  defaultVisibility: VisibilityMode;
  mutualRevealEnabled: boolean;
  active: boolean;
}

export interface Crush {
  id: string;
  submitterUserId: string;
  submitterName: string;
  submitterInstagramId: string; // Added for matching
  targetUserId?: string; // Optional, if matched to a real user
  targetName: string; // Normalized lowercase for search
  targetNameDisplay: string; // Original casing
  targetInstagramId: string; // Added for matching
  visibilityMode: VisibilityMode;
  periodId: string;
  createdAt: number;
  withdrawn: boolean;
  isMutual: boolean;
  flagged?: boolean;
}

export interface Match {
  id: string;
  userAId: string;
  userBId: string;
  userAName: string;
  userBName: string;
  periodId: string;
  createdAt: number;
}

export interface Report {
  id: string;
  reporterUserId: string;
  crushId: string;
  reason: string;
  createdAt: number;
  resolved: boolean;
}

export interface PeriodStats {
  totalCrushes: number;
  totalMatches: number;
  topNames: { name: string; count: number }[];
  dailySubmissions: { date: string; count: number }[];
}