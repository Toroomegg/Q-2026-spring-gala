
export interface Candidate {
  id: string;
  name: string;
  song: string;
  image?: string;      // URL to photo
  videoLink?: string;  // URL to video
  totalScore: number;  // Sum of all scores
  voteCount: number;   // Number of people who voted (to calc average)
  color: string;
}

export interface VoteState {
  // Instead of a global "hasVoted", we track which candidate IDs this user has scored
  scoredCandidateIds: string[]; 
}

export enum PageView {
  VOTE = 'VOTE',
  RESULTS = 'RESULTS',
  ADMIN = 'ADMIN'
}

// Neon Palette for Dark Mode
export const COLORS = [
  '#ff4d4d', // Neon Red
  '#ffca28', // Neon Amber
  '#00e676', // Neon Green
  '#2979ff', // Neon Blue
  '#d500f9', // Neon Purple
  '#ff4081', // Neon Pink
  '#00bcd4', // Neon Cyan
  '#e040fb', // Neon Fuchsia
];
