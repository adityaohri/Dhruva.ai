export interface QueryConfig {
  query: string;
  firm: string;
  firm_tier: "bulge_bracket" | "elite_boutique" | "india_focused";
  signal_type: "interview_experience" | "hiring_criteria" | "process_structure" | "profile_tip";
  source_domain?: string;
  cadence: "monthly" | "quarterly" | "biannual";
}

export const QUERIES: QueryConfig[] = [
  // Bulge bracket (monthly hiring criteria + quarterly process/interview + biannual profile tips)
  { query: "Goldman Sachs India investment banking shortlist criteria profile", firm: "goldman_sachs", firm_tier: "bulge_bracket", signal_type: "hiring_criteria", source_domain: "mergersandinquisitions.com", cadence: "monthly" },
  { query: "Goldman Sachs India hiring profile site:reddit.com/r/IndianMBAs OR site:reddit.com/r/FinancialCareers", firm: "goldman_sachs", firm_tier: "bulge_bracket", signal_type: "hiring_criteria", cadence: "monthly" },
  { query: "Goldman Sachs India investment banking interview experience", firm: "goldman_sachs", firm_tier: "bulge_bracket", signal_type: "interview_experience", source_domain: "glassdoor.co.in", cadence: "quarterly" },
  { query: "Goldman Sachs investment banking superday process technical questions", firm: "goldman_sachs", firm_tier: "bulge_bracket", signal_type: "process_structure", source_domain: "mergersandinquisitions.com", cadence: "quarterly" },
  { query: "how I got Goldman Sachs India offer profile tips undergraduate", firm: "goldman_sachs", firm_tier: "bulge_bracket", signal_type: "profile_tip", source_domain: "medium.com", cadence: "monthly" },

  { query: "JP Morgan India investment banking shortlist criteria profile", firm: "jpmorgan", firm_tier: "bulge_bracket", signal_type: "hiring_criteria", source_domain: "mergersandinquisitions.com", cadence: "monthly" },
  { query: "JP Morgan India hiring profile site:reddit.com/r/IndianMBAs OR site:reddit.com/r/FinancialCareers", firm: "jpmorgan", firm_tier: "bulge_bracket", signal_type: "hiring_criteria", cadence: "monthly" },
  { query: "JP Morgan India investment banking interview experience", firm: "jpmorgan", firm_tier: "bulge_bracket", signal_type: "interview_experience", source_domain: "glassdoor.co.in", cadence: "quarterly" },
  { query: "JP Morgan investment banking superday process technical what tested", firm: "jpmorgan", firm_tier: "bulge_bracket", signal_type: "process_structure", source_domain: "mergersandinquisitions.com", cadence: "quarterly" },
  { query: "how I got JP Morgan India offer profile tips undergraduate", firm: "jpmorgan", firm_tier: "bulge_bracket", signal_type: "profile_tip", source_domain: "medium.com", cadence: "monthly" },

  { query: "Morgan Stanley India IB hiring profile site:reddit.com/r/IndianMBAs OR site:reddit.com/r/FinancialCareers", firm: "morgan_stanley", firm_tier: "bulge_bracket", signal_type: "hiring_criteria", cadence: "monthly" },
  { query: "Morgan Stanley India investment banking interview experience", firm: "morgan_stanley", firm_tier: "bulge_bracket", signal_type: "interview_experience", source_domain: "glassdoor.co.in", cadence: "quarterly" },
  { query: "Morgan Stanley investment banking superday process technical what tested", firm: "morgan_stanley", firm_tier: "bulge_bracket", signal_type: "process_structure", source_domain: "mergersandinquisitions.com", cadence: "quarterly" },
  { query: "how I got Morgan Stanley India investment banking offer profile tips", firm: "morgan_stanley", firm_tier: "bulge_bracket", signal_type: "profile_tip", source_domain: "medium.com", cadence: "monthly" },

  { query: "Bank of America India IB hiring criteria profile what they look for", firm: "bofa", firm_tier: "bulge_bracket", signal_type: "hiring_criteria", source_domain: "efinancialcareers.com", cadence: "monthly" },
  { query: "Citi India IB hiring criteria profile what they look for", firm: "citi", firm_tier: "bulge_bracket", signal_type: "hiring_criteria", source_domain: "efinancialcareers.com", cadence: "monthly" },
  { query: "Deutsche Bank India IB hiring criteria profile what they look for", firm: "deutsche_bank", firm_tier: "bulge_bracket", signal_type: "hiring_criteria", source_domain: "efinancialcareers.com", cadence: "monthly" },
  { query: "Jefferies India IB hiring criteria profile what they look for", firm: "jefferies", firm_tier: "bulge_bracket", signal_type: "hiring_criteria", source_domain: "efinancialcareers.com", cadence: "monthly" },
  { query: "HSBC India IB hiring criteria profile what they look for", firm: "hsbc", firm_tier: "bulge_bracket", signal_type: "hiring_criteria", source_domain: "efinancialcareers.com", cadence: "monthly" },

  // Elite boutiques (quarterly cadence)
  { query: "Lazard India investment banking hiring criteria profile", firm: "lazard", firm_tier: "elite_boutique", signal_type: "hiring_criteria", source_domain: "efinancialcareers.com", cadence: "quarterly" },
  { query: "Rothschild India investment banking hiring criteria profile", firm: "rothschild", firm_tier: "elite_boutique", signal_type: "hiring_criteria", source_domain: "efinancialcareers.com", cadence: "quarterly" },
  { query: "Evercore India investment banking hiring criteria profile", firm: "evercore", firm_tier: "elite_boutique", signal_type: "hiring_criteria", source_domain: "mergersandinquisitions.com", cadence: "quarterly" },
  { query: "Houlihan Lokey India investment banking hiring criteria profile", firm: "houlihan_lokey", firm_tier: "elite_boutique", signal_type: "hiring_criteria", source_domain: "mergersandinquisitions.com", cadence: "quarterly" },
  { query: "elite boutique investment banking India interview process technical rounds", firm: "all_ib", firm_tier: "elite_boutique", signal_type: "process_structure", source_domain: "mergersandinquisitions.com", cadence: "quarterly" },

  // India-focused banks (quarterly cadence)
  { query: "Kotak investment banking India interview experience", firm: "kotak_ib", firm_tier: "india_focused", signal_type: "interview_experience", source_domain: "glassdoor.co.in", cadence: "quarterly" },
  { query: "Avendus Capital India investment banking interview experience", firm: "avendus", firm_tier: "india_focused", signal_type: "interview_experience", source_domain: "glassdoor.co.in", cadence: "quarterly" },
  { query: "Axis Capital India investment banking interview process rounds", firm: "axis_capital", firm_tier: "india_focused", signal_type: "process_structure", source_domain: "efinancialcareers.com", cadence: "quarterly" },
  { query: "ICICI Securities India investment banking hiring criteria profile", firm: "icici_securities", firm_tier: "india_focused", signal_type: "hiring_criteria", source_domain: "efinancialcareers.com", cadence: "quarterly" },
  { query: "JM Financial India investment banking hiring criteria profile", firm: "jm_financial", firm_tier: "india_focused", signal_type: "hiring_criteria", source_domain: "efinancialcareers.com", cadence: "quarterly" },
  { query: "SBI Capital Markets India investment banking interview process rounds", firm: "sbicaps", firm_tier: "india_focused", signal_type: "process_structure", source_domain: "efinancialcareers.com", cadence: "quarterly" },

  // Reddit + Medium broad overlays (fast-moving, run monthly)
  { query: "investment banking India campus shortlist profile site:reddit.com/r/IndianMBAs", firm: "all_ib", firm_tier: "bulge_bracket", signal_type: "hiring_criteria", cadence: "monthly" },
  { query: "investment banking India offer experience hiring site:reddit.com/r/ibanking OR site:reddit.com/r/FinancialCareers", firm: "all_ib", firm_tier: "bulge_bracket", signal_type: "interview_experience", cadence: "monthly" },
  { query: "investment banking India interview process what banks test site:reddit.com/r/FinancialCareers", firm: "all_ib", firm_tier: "bulge_bracket", signal_type: "process_structure", cadence: "monthly" },
  { query: "how I broke into investment banking India undergraduate journey profile", firm: "all_ib", firm_tier: "bulge_bracket", signal_type: "profile_tip", source_domain: "medium.com", cadence: "monthly" },
  { query: "investment banking India campus placement tips what worked profile", firm: "all_ib", firm_tier: "bulge_bracket", signal_type: "profile_tip", source_domain: "medium.com", cadence: "monthly" },
  { query: "investment banking India interview experience superday what happened", firm: "all_ib", firm_tier: "bulge_bracket", signal_type: "interview_experience", source_domain: "medium.com", cadence: "monthly" },
];

export const CAREERS_PAGES = [
  { url: "https://www.goldmansachs.com/careers/students/programs/india", firm: "goldman_sachs" },
  { url: "https://careers.jpmorgan.com/global/en/students", firm: "jpmorgan" },
  { url: "https://www.morganstanley.com/people/india-campus-recruiting", firm: "morgan_stanley" },
  { url: "https://www.kotak.com/en/about-us/careers.html", firm: "kotak_ib" },
  { url: "https://www.avendus.com/india/about/careers", firm: "avendus" },
];
