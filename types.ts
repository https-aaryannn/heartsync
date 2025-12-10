export enum VisibilityMode {
  ANON_COUNT = 'ANON_COUNT',
  MUTUAL_ONLY = 'MUTUAL_ONLY',
  REVEAL_AFTER_PERIOD = 'REVEAL_AFTER_PERIOD'
}


export interface UserProfile {
  uid: string;
  instagramUsername: string; // "instagramUsername" as requested
  displayName: string | null;
  photoURL: string | null;
  isAdmin?: boolean;
  createdAt: number;
}

export interface Period {
  id: string;
  name: string;
  startAt: number;
  endAt: number;
  defaultVisibility: VisibilityMode;
  mutualRevealEnabled: boolean;
  active: boolean;
}

export interface Crush {
  id: string;
  submitterUserId: string; // useful availability
  submitterName: string; // useful display
  submitterInstagram: string; // The KEY field requested
  targetInstagram: string; // The KEY field requested
  targetName: string; // Added for UI consistency
  targetNameDisplay: string;
  visibilityMode: VisibilityMode;
  periodId: string;
  createdAt: number;
  withdrawn: boolean;
  isMutual: boolean;
  status: 'pending' | 'matched';
  flagged?: boolean;
}

export interface Match {
  id: string;
  userAInstagram: string;
  userBInstagram: string;
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