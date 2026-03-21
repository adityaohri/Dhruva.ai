export interface QueryConfig {
  query: string;
  firm: string;
  firm_tier: "bulge_bracket" | "elite_boutique" | "india_focused";
  signal_type: "interview_experience" | "hiring_criteria" | "process_structure" | "profile_tip";
  source_domain?: string;
  cadence: "monthly" | "quarterly" | "biannual";
}

export const QUERIES: QueryConfig[] = [
  // Bulge bracket: prioritize M&A guides + Medium experiences
  { query: "Goldman Sachs India investment banking shortlist criteria profile", firm: "goldman_sachs", firm_tier: "bulge_bracket", signal_type: "hiring_criteria", source_domain: "mergersandinquisitions.com", cadence: "monthly" },
  { query: "Goldman Sachs investment banking superday process technical questions", firm: "goldman_sachs", firm_tier: "bulge_bracket", signal_type: "process_structure", source_domain: "mergersandinquisitions.com", cadence: "quarterly" },
  { query: "Goldman Sachs India investment banking interview experience", firm: "goldman_sachs", firm_tier: "bulge_bracket", signal_type: "interview_experience", source_domain: "glassdoor.co.in", cadence: "quarterly" },
  { query: "how I got Goldman Sachs India investment banking offer interview experience", firm: "goldman_sachs", firm_tier: "bulge_bracket", signal_type: "interview_experience", source_domain: "medium.com", cadence: "monthly" },
  { query: "Goldman Sachs India investment banking profile tips what worked", firm: "goldman_sachs", firm_tier: "bulge_bracket", signal_type: "profile_tip", source_domain: "medium.com", cadence: "monthly" },

  { query: "JP Morgan India investment banking shortlist criteria profile", firm: "jpmorgan", firm_tier: "bulge_bracket", signal_type: "hiring_criteria", source_domain: "mergersandinquisitions.com", cadence: "monthly" },
  { query: "JP Morgan investment banking superday process technical what tested", firm: "jpmorgan", firm_tier: "bulge_bracket", signal_type: "process_structure", source_domain: "mergersandinquisitions.com", cadence: "quarterly" },
  { query: "JP Morgan India investment banking interview experience", firm: "jpmorgan", firm_tier: "bulge_bracket", signal_type: "interview_experience", source_domain: "glassdoor.co.in", cadence: "quarterly" },
  { query: "how I got JP Morgan India investment banking offer interview experience", firm: "jpmorgan", firm_tier: "bulge_bracket", signal_type: "interview_experience", source_domain: "medium.com", cadence: "monthly" },
  { query: "JP Morgan India investment banking profile tips what worked", firm: "jpmorgan", firm_tier: "bulge_bracket", signal_type: "profile_tip", source_domain: "medium.com", cadence: "monthly" },

  { query: "Morgan Stanley investment banking superday process technical what tested", firm: "morgan_stanley", firm_tier: "bulge_bracket", signal_type: "process_structure", source_domain: "mergersandinquisitions.com", cadence: "quarterly" },
  { query: "Morgan Stanley India investment banking interview experience", firm: "morgan_stanley", firm_tier: "bulge_bracket", signal_type: "interview_experience", source_domain: "glassdoor.co.in", cadence: "quarterly" },
  { query: "how I got Morgan Stanley India investment banking offer interview experience", firm: "morgan_stanley", firm_tier: "bulge_bracket", signal_type: "interview_experience", source_domain: "medium.com", cadence: "monthly" },
  { query: "Morgan Stanley India investment banking profile tips what worked", firm: "morgan_stanley", firm_tier: "bulge_bracket", signal_type: "profile_tip", source_domain: "medium.com", cadence: "monthly" },

  { query: "Bank of America India investment banking interview experience", firm: "bofa", firm_tier: "bulge_bracket", signal_type: "interview_experience", source_domain: "glassdoor.co.in", cadence: "quarterly" },
  { query: "how I got Bank of America India investment banking interview experience", firm: "bofa", firm_tier: "bulge_bracket", signal_type: "interview_experience", source_domain: "medium.com", cadence: "monthly" },
  { query: "Citi India investment banking interview experience", firm: "citi", firm_tier: "bulge_bracket", signal_type: "interview_experience", source_domain: "glassdoor.co.in", cadence: "quarterly" },
  { query: "how I got Citi India investment banking interview experience", firm: "citi", firm_tier: "bulge_bracket", signal_type: "interview_experience", source_domain: "medium.com", cadence: "monthly" },
  { query: "Deutsche Bank India investment banking interview experience", firm: "deutsche_bank", firm_tier: "bulge_bracket", signal_type: "interview_experience", source_domain: "glassdoor.co.in", cadence: "quarterly" },
  { query: "how I got Deutsche Bank India investment banking interview experience", firm: "deutsche_bank", firm_tier: "bulge_bracket", signal_type: "interview_experience", source_domain: "medium.com", cadence: "monthly" },

  // Elite boutiques
  { query: "Evercore India investment banking hiring criteria profile", firm: "evercore", firm_tier: "elite_boutique", signal_type: "hiring_criteria", source_domain: "mergersandinquisitions.com", cadence: "quarterly" },
  { query: "Houlihan Lokey India investment banking hiring criteria profile", firm: "houlihan_lokey", firm_tier: "elite_boutique", signal_type: "hiring_criteria", source_domain: "mergersandinquisitions.com", cadence: "quarterly" },
  { query: "elite boutique investment banking India interview process technical rounds", firm: "all_ib", firm_tier: "elite_boutique", signal_type: "process_structure", source_domain: "mergersandinquisitions.com", cadence: "quarterly" },
  { query: "Lazard India investment banking interview experience what rounds", firm: "lazard", firm_tier: "elite_boutique", signal_type: "interview_experience", source_domain: "medium.com", cadence: "monthly" },
  { query: "Rothschild India investment banking interview experience what rounds", firm: "rothschild", firm_tier: "elite_boutique", signal_type: "interview_experience", source_domain: "medium.com", cadence: "monthly" },

  // India-focused banks
  { query: "Kotak investment banking India interview experience", firm: "kotak_ib", firm_tier: "india_focused", signal_type: "interview_experience", source_domain: "glassdoor.co.in", cadence: "quarterly" },
  { query: "Avendus Capital India investment banking interview experience", firm: "avendus", firm_tier: "india_focused", signal_type: "interview_experience", source_domain: "glassdoor.co.in", cadence: "quarterly" },
  { query: "Axis Capital India investment banking interview process rounds", firm: "axis_capital", firm_tier: "india_focused", signal_type: "process_structure", source_domain: "mergersandinquisitions.com", cadence: "quarterly" },
  { query: "ICICI Securities India investment banking interview process rounds", firm: "icici_securities", firm_tier: "india_focused", signal_type: "process_structure", source_domain: "mergersandinquisitions.com", cadence: "quarterly" },
  { query: "JM Financial India investment banking interview process rounds", firm: "jm_financial", firm_tier: "india_focused", signal_type: "process_structure", source_domain: "mergersandinquisitions.com", cadence: "quarterly" },
  { query: "SBI Capital Markets India investment banking interview process rounds", firm: "sbicaps", firm_tier: "india_focused", signal_type: "process_structure", source_domain: "mergersandinquisitions.com", cadence: "quarterly" },
  { query: "how I got Kotak investment banking India offer interview experience", firm: "kotak_ib", firm_tier: "india_focused", signal_type: "interview_experience", source_domain: "medium.com", cadence: "monthly" },
  { query: "how I got Avendus Capital India offer interview experience", firm: "avendus", firm_tier: "india_focused", signal_type: "interview_experience", source_domain: "medium.com", cadence: "monthly" },
  { query: "how I got Axis Capital India investment banking offer interview experience", firm: "axis_capital", firm_tier: "india_focused", signal_type: "interview_experience", source_domain: "medium.com", cadence: "monthly" },

  // Broad Medium overlays
  { query: "how I broke into investment banking India undergraduate journey interview rounds", firm: "all_ib", firm_tier: "bulge_bracket", signal_type: "interview_experience", source_domain: "medium.com", cadence: "monthly" },
  { query: "investment banking India interview experience superday what happened", firm: "all_ib", firm_tier: "bulge_bracket", signal_type: "interview_experience", source_domain: "medium.com", cadence: "monthly" },
  { query: "investment banking India campus placement profile tips what worked", firm: "all_ib", firm_tier: "bulge_bracket", signal_type: "profile_tip", source_domain: "medium.com", cadence: "monthly" },
];

export const CAREERS_PAGES = [
  { url: "https://www.goldmansachs.com/careers/students/programs/india", firm: "goldman_sachs" },
  { url: "https://careers.jpmorgan.com/global/en/students", firm: "jpmorgan" },
  { url: "https://www.morganstanley.com/people/india-campus-recruiting", firm: "morgan_stanley" },
  { url: "https://www.kotak.com/en/about-us/careers.html", firm: "kotak_ib" },
  { url: "https://www.avendus.com/india/about/careers", firm: "avendus" },
];
