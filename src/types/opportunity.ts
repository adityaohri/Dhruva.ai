/**
 * Shared type for job/opportunity results from index, sentinel, or live APIs.
 */
export type OpportunityResult = {
  title: string;
  url: string;
  snippet: string;
  source: string;
  isDirect: boolean;
  company?: string | null;
  displayName?: string;
  summary?: string | null;
  prestige_score?: number;
  originalIndex?: number;
  match_score?: number | null;
  match_band?: "Strong" | "Good" | "Moderate" | "Stretch";
  match_strengths?: string[];
  match_gaps?: string[];
  match_action_item?: string;
  bucket?: "A" | "B" | "C" | "D" | "E";
  recencyScore?: number;
  isFresh?: boolean;
  location?: string | null;
  posted_at?: string | null;
  isVerified?: boolean;
  industry?: string | null;
  experience_level?: string | null;
};
