export interface QueryConfig {
  query: string;
  firm: string;
  firm_tier: "bulge_bracket" | "elite_boutique" | "india_focused";
  signal_type: "interview_experience" | "hiring_criteria" | "process_structure" | "profile_tip";
  source_domain?: string;
  cadence: "monthly" | "quarterly" | "biannual";
}

export const QUERIES: QueryConfig[] = [
  { query: "Goldman Sachs India investment banking interview experience campus hiring", firm: "goldman_sachs", firm_tier: "bulge_bracket", signal_type: "interview_experience", source_domain: "glassdoor.co.in", cadence: "quarterly" },
  { query: "Goldman Sachs India investment banking interview experience hiring", firm: "goldman_sachs", firm_tier: "bulge_bracket", signal_type: "interview_experience", source_domain: "ambitionbox.com", cadence: "quarterly" },
  { query: "Goldman Sachs India campus hiring profile what they look for investment banking", firm: "goldman_sachs", firm_tier: "bulge_bracket", signal_type: "hiring_criteria", source_domain: "ambitionbox.com", cadence: "monthly" },
  { query: "Goldman Sachs India investment banking shortlist criteria hiring profile", firm: "goldman_sachs", firm_tier: "bulge_bracket", signal_type: "hiring_criteria", source_domain: "mergersandinquisitions.com", cadence: "monthly" },
  { query: "Goldman Sachs India IB hiring profile site:reddit.com/r/IndiaInvestments OR site:reddit.com/r/FinancialCareers", firm: "goldman_sachs", firm_tier: "bulge_bracket", signal_type: "hiring_criteria", cadence: "monthly" },
  { query: "how I got Goldman Sachs India investment banking offer profile tips", firm: "goldman_sachs", firm_tier: "bulge_bracket", signal_type: "profile_tip", source_domain: "medium.com", cadence: "biannual" },
  { query: "Goldman Sachs India IB offer tips preparation profile site:reddit.com/r/IndiaInvestments", firm: "goldman_sachs", firm_tier: "bulge_bracket", signal_type: "profile_tip", cadence: "biannual" },
  { query: "Goldman Sachs India investment banking interview process rounds structure", firm: "goldman_sachs", firm_tier: "bulge_bracket", signal_type: "process_structure", source_domain: "ambitionbox.com", cadence: "quarterly" },
  { query: "Goldman Sachs investment banking superday interview process technical questions", firm: "goldman_sachs", firm_tier: "bulge_bracket", signal_type: "process_structure", source_domain: "mergersandinquisitions.com", cadence: "quarterly" },

  { query: "JP Morgan India investment banking interview experience campus hiring", firm: "jpmorgan", firm_tier: "bulge_bracket", signal_type: "interview_experience", source_domain: "glassdoor.co.in", cadence: "quarterly" },
  { query: "JP Morgan India investment banking interview experience hiring", firm: "jpmorgan", firm_tier: "bulge_bracket", signal_type: "interview_experience", source_domain: "ambitionbox.com", cadence: "quarterly" },
  { query: "JP Morgan India campus hiring profile what they look for investment banking", firm: "jpmorgan", firm_tier: "bulge_bracket", signal_type: "hiring_criteria", source_domain: "ambitionbox.com", cadence: "monthly" },
  { query: "JP Morgan India investment banking shortlist criteria hiring profile", firm: "jpmorgan", firm_tier: "bulge_bracket", signal_type: "hiring_criteria", source_domain: "mergersandinquisitions.com", cadence: "monthly" },
  { query: "JP Morgan India IB hiring profile site:reddit.com/r/IndiaInvestments OR site:reddit.com/r/FinancialCareers", firm: "jpmorgan", firm_tier: "bulge_bracket", signal_type: "hiring_criteria", cadence: "monthly" },
  { query: "how I got JP Morgan India investment banking offer profile tips", firm: "jpmorgan", firm_tier: "bulge_bracket", signal_type: "profile_tip", source_domain: "medium.com", cadence: "biannual" },
  { query: "JP Morgan India investment banking interview process rounds structure", firm: "jpmorgan", firm_tier: "bulge_bracket", signal_type: "process_structure", source_domain: "ambitionbox.com", cadence: "quarterly" },
  { query: "JP Morgan investment banking superday process technical what tested", firm: "jpmorgan", firm_tier: "bulge_bracket", signal_type: "process_structure", source_domain: "mergersandinquisitions.com", cadence: "quarterly" },

  { query: "Morgan Stanley India investment banking interview experience campus hiring", firm: "morgan_stanley", firm_tier: "bulge_bracket", signal_type: "interview_experience", source_domain: "glassdoor.co.in", cadence: "quarterly" },
  { query: "Morgan Stanley India investment banking interview experience hiring", firm: "morgan_stanley", firm_tier: "bulge_bracket", signal_type: "interview_experience", source_domain: "ambitionbox.com", cadence: "quarterly" },
  { query: "Morgan Stanley India campus hiring profile what they look for IB", firm: "morgan_stanley", firm_tier: "bulge_bracket", signal_type: "hiring_criteria", source_domain: "ambitionbox.com", cadence: "monthly" },
  { query: "Morgan Stanley India IB hiring profile site:reddit.com/r/IndiaInvestments OR site:reddit.com/r/FinancialCareers", firm: "morgan_stanley", firm_tier: "bulge_bracket", signal_type: "hiring_criteria", cadence: "monthly" },
  { query: "how I got Morgan Stanley India investment banking offer profile tips", firm: "morgan_stanley", firm_tier: "bulge_bracket", signal_type: "profile_tip", source_domain: "medium.com", cadence: "biannual" },
  { query: "Morgan Stanley India investment banking interview process rounds structure", firm: "morgan_stanley", firm_tier: "bulge_bracket", signal_type: "process_structure", source_domain: "ambitionbox.com", cadence: "quarterly" },
  { query: "Morgan Stanley investment banking superday process technical what tested", firm: "morgan_stanley", firm_tier: "bulge_bracket", signal_type: "process_structure", source_domain: "mergersandinquisitions.com", cadence: "quarterly" },

  { query: "Bank of America India investment banking interview experience hiring", firm: "bofa", firm_tier: "bulge_bracket", signal_type: "interview_experience", source_domain: "ambitionbox.com", cadence: "quarterly" },
  { query: "Bank of America India IB hiring criteria profile what they look for", firm: "bofa", firm_tier: "bulge_bracket", signal_type: "hiring_criteria", source_domain: "ambitionbox.com", cadence: "monthly" },
  { query: "Bank of America India investment banking interview process rounds", firm: "bofa", firm_tier: "bulge_bracket", signal_type: "process_structure", cadence: "quarterly" },

  { query: "Citi India investment banking interview experience hiring", firm: "citi", firm_tier: "bulge_bracket", signal_type: "interview_experience", source_domain: "ambitionbox.com", cadence: "quarterly" },
  { query: "Citi India IB hiring criteria profile what they look for", firm: "citi", firm_tier: "bulge_bracket", signal_type: "hiring_criteria", source_domain: "ambitionbox.com", cadence: "monthly" },
  { query: "Citi India investment banking interview process rounds structure", firm: "citi", firm_tier: "bulge_bracket", signal_type: "process_structure", cadence: "quarterly" },

  { query: "Deutsche Bank India investment banking interview experience hiring", firm: "deutsche_bank", firm_tier: "bulge_bracket", signal_type: "interview_experience", source_domain: "ambitionbox.com", cadence: "quarterly" },
  { query: "Deutsche Bank India IB hiring criteria profile what they look for", firm: "deutsche_bank", firm_tier: "bulge_bracket", signal_type: "hiring_criteria", source_domain: "ambitionbox.com", cadence: "monthly" },
  { query: "Deutsche Bank India investment banking interview process rounds", firm: "deutsche_bank", firm_tier: "bulge_bracket", signal_type: "process_structure", cadence: "quarterly" },

  { query: "Jefferies India investment banking interview experience hiring", firm: "jefferies", firm_tier: "bulge_bracket", signal_type: "interview_experience", source_domain: "ambitionbox.com", cadence: "quarterly" },
  { query: "Jefferies India IB hiring criteria profile what they look for", firm: "jefferies", firm_tier: "bulge_bracket", signal_type: "hiring_criteria", source_domain: "ambitionbox.com", cadence: "monthly" },
  { query: "Jefferies India investment banking interview process rounds", firm: "jefferies", firm_tier: "bulge_bracket", signal_type: "process_structure", cadence: "quarterly" },

  { query: "HSBC India investment banking interview experience hiring", firm: "hsbc", firm_tier: "bulge_bracket", signal_type: "interview_experience", source_domain: "ambitionbox.com", cadence: "quarterly" },
  { query: "HSBC India IB hiring criteria profile what they look for", firm: "hsbc", firm_tier: "bulge_bracket", signal_type: "hiring_criteria", source_domain: "ambitionbox.com", cadence: "monthly" },
  { query: "HSBC India investment banking interview process rounds structure", firm: "hsbc", firm_tier: "bulge_bracket", signal_type: "process_structure", cadence: "quarterly" },

  { query: "Lazard India investment banking interview experience hiring", firm: "lazard", firm_tier: "elite_boutique", signal_type: "interview_experience", source_domain: "ambitionbox.com", cadence: "quarterly" },
  { query: "Lazard India IB hiring criteria profile what they look for", firm: "lazard", firm_tier: "elite_boutique", signal_type: "hiring_criteria", cadence: "quarterly" },
  { query: "Lazard India investment banking interview process rounds structure", firm: "lazard", firm_tier: "elite_boutique", signal_type: "process_structure", source_domain: "mergersandinquisitions.com", cadence: "quarterly" },
  { query: "Rothschild India investment banking interview experience hiring", firm: "rothschild", firm_tier: "elite_boutique", signal_type: "interview_experience", source_domain: "ambitionbox.com", cadence: "quarterly" },
  { query: "Rothschild India IB hiring criteria profile what they look for", firm: "rothschild", firm_tier: "elite_boutique", signal_type: "hiring_criteria", cadence: "quarterly" },
  { query: "Rothschild India investment banking interview process rounds", firm: "rothschild", firm_tier: "elite_boutique", signal_type: "process_structure", cadence: "quarterly" },
  { query: "Evercore India investment banking interview experience hiring", firm: "evercore", firm_tier: "elite_boutique", signal_type: "interview_experience", cadence: "quarterly" },
  { query: "Evercore India IB hiring criteria profile what they look for", firm: "evercore", firm_tier: "elite_boutique", signal_type: "hiring_criteria", source_domain: "mergersandinquisitions.com", cadence: "quarterly" },
  { query: "Evercore India investment banking interview process rounds", firm: "evercore", firm_tier: "elite_boutique", signal_type: "process_structure", cadence: "quarterly" },
  { query: "Houlihan Lokey India investment banking interview experience hiring", firm: "houlihan_lokey", firm_tier: "elite_boutique", signal_type: "interview_experience", cadence: "quarterly" },
  { query: "Houlihan Lokey India IB hiring criteria profile what they look for", firm: "houlihan_lokey", firm_tier: "elite_boutique", signal_type: "hiring_criteria", cadence: "quarterly" },
  { query: "Houlihan Lokey India investment banking interview process rounds", firm: "houlihan_lokey", firm_tier: "elite_boutique", signal_type: "process_structure", cadence: "quarterly" },

  { query: "Kotak Investment Banking India interview experience campus hiring", firm: "kotak_ib", firm_tier: "india_focused", signal_type: "interview_experience", source_domain: "ambitionbox.com", cadence: "quarterly" },
  { query: "Kotak Investment Banking India interview experience hiring", firm: "kotak_ib", firm_tier: "india_focused", signal_type: "interview_experience", source_domain: "glassdoor.co.in", cadence: "quarterly" },
  { query: "Kotak IB India hiring criteria profile what they look for", firm: "kotak_ib", firm_tier: "india_focused", signal_type: "hiring_criteria", source_domain: "ambitionbox.com", cadence: "quarterly" },
  { query: "Kotak Investment Banking India interview process rounds structure", firm: "kotak_ib", firm_tier: "india_focused", signal_type: "process_structure", source_domain: "ambitionbox.com", cadence: "quarterly" },

  { query: "Avendus Capital India interview experience campus hiring IB", firm: "avendus", firm_tier: "india_focused", signal_type: "interview_experience", source_domain: "ambitionbox.com", cadence: "quarterly" },
  { query: "Avendus Capital India interview experience hiring", firm: "avendus", firm_tier: "india_focused", signal_type: "interview_experience", source_domain: "glassdoor.co.in", cadence: "quarterly" },
  { query: "Avendus Capital India hiring criteria profile what they look for", firm: "avendus", firm_tier: "india_focused", signal_type: "hiring_criteria", source_domain: "ambitionbox.com", cadence: "quarterly" },
  { query: "Avendus Capital India interview process rounds structure", firm: "avendus", firm_tier: "india_focused", signal_type: "process_structure", source_domain: "ambitionbox.com", cadence: "quarterly" },

  { query: "Axis Capital India investment banking interview experience hiring", firm: "axis_capital", firm_tier: "india_focused", signal_type: "interview_experience", source_domain: "ambitionbox.com", cadence: "quarterly" },
  { query: "Axis Capital India IB interview experience hiring", firm: "axis_capital", firm_tier: "india_focused", signal_type: "interview_experience", source_domain: "glassdoor.co.in", cadence: "quarterly" },
  { query: "Axis Capital India hiring criteria profile what they look for", firm: "axis_capital", firm_tier: "india_focused", signal_type: "hiring_criteria", source_domain: "ambitionbox.com", cadence: "quarterly" },
  { query: "Axis Capital India interview process rounds structure", firm: "axis_capital", firm_tier: "india_focused", signal_type: "process_structure", source_domain: "ambitionbox.com", cadence: "quarterly" },

  { query: "ICICI Securities India investment banking interview experience hiring", firm: "icici_securities", firm_tier: "india_focused", signal_type: "interview_experience", source_domain: "ambitionbox.com", cadence: "quarterly" },
  { query: "ICICI Securities India IB hiring criteria profile what they look for", firm: "icici_securities", firm_tier: "india_focused", signal_type: "hiring_criteria", source_domain: "ambitionbox.com", cadence: "quarterly" },
  { query: "ICICI Securities India investment banking interview process rounds", firm: "icici_securities", firm_tier: "india_focused", signal_type: "process_structure", source_domain: "ambitionbox.com", cadence: "quarterly" },
  { query: "JM Financial India investment banking interview experience hiring", firm: "jm_financial", firm_tier: "india_focused", signal_type: "interview_experience", source_domain: "ambitionbox.com", cadence: "quarterly" },
  { query: "JM Financial India IB hiring criteria profile what they look for", firm: "jm_financial", firm_tier: "india_focused", signal_type: "hiring_criteria", source_domain: "ambitionbox.com", cadence: "quarterly" },
  { query: "JM Financial India interview process rounds structure", firm: "jm_financial", firm_tier: "india_focused", signal_type: "process_structure", source_domain: "ambitionbox.com", cadence: "quarterly" },
  { query: "SBI Capital Markets India investment banking interview experience", firm: "sbicaps", firm_tier: "india_focused", signal_type: "interview_experience", source_domain: "ambitionbox.com", cadence: "quarterly" },
  { query: "SBI Capital Markets India IB hiring criteria profile what they look for", firm: "sbicaps", firm_tier: "india_focused", signal_type: "hiring_criteria", source_domain: "ambitionbox.com", cadence: "quarterly" },
  { query: "SBI Capital Markets India interview process rounds structure", firm: "sbicaps", firm_tier: "india_focused", signal_type: "process_structure", source_domain: "ambitionbox.com", cadence: "quarterly" },

  { query: "investment banking India campus hiring profile what they look for", firm: "all_ib", firm_tier: "bulge_bracket", signal_type: "hiring_criteria", source_domain: "mergersandinquisitions.com", cadence: "quarterly" },
  { query: "investment banking India interview experience campus placement", firm: "all_ib", firm_tier: "bulge_bracket", signal_type: "interview_experience", source_domain: "ambitionbox.com", cadence: "quarterly" },
  { query: "how to get investment banking offer India profile tips preparation", firm: "all_ib", firm_tier: "bulge_bracket", signal_type: "profile_tip", source_domain: "medium.com", cadence: "biannual" },
  { query: "investment banking India technical interview what is tested preparation", firm: "all_ib", firm_tier: "bulge_bracket", signal_type: "process_structure", source_domain: "mergersandinquisitions.com", cadence: "quarterly" },
  { query: "investment banking India interview process what banks test site:reddit.com/r/FinancialCareers", firm: "all_ib", firm_tier: "bulge_bracket", signal_type: "process_structure", cadence: "quarterly" },
  { query: "investment banking India profile tips hiring site:reddit.com/r/IndiaInvestments", firm: "all_ib", firm_tier: "bulge_bracket", signal_type: "profile_tip", cadence: "biannual" },
];

export const CAREERS_PAGES = [
  { url: "https://www.goldmansachs.com/careers/students/programs/india", firm: "goldman_sachs" },
  { url: "https://careers.jpmorgan.com/global/en/students", firm: "jpmorgan" },
  { url: "https://www.morganstanley.com/people/india-campus-recruiting", firm: "morgan_stanley" },
  { url: "https://www.kotak.com/en/about-us/careers.html", firm: "kotak_ib" },
  { url: "https://www.avendus.com/india/about/careers", firm: "avendus" },
];
