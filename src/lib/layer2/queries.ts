export interface QueryConfig {
  query: string;
  firm: string;
  firm_tier: 'mbb' | 'strategy_boutique' | 'big4' | 'social_governance' | 'indian_boutique';
  signal_type: 'interview_experience' | 'hiring_criteria' | 'process_structure' | 'profile_tip';
  source_domain?: string;
  cadence: 'monthly' | 'quarterly' | 'biannual';
}

const BASE_QUERIES: QueryConfig[] = [

  // ════════════════════════════════════════════════════════════
  // MBB — McKINSEY
  // 10 queries — deepest coverage
  // ════════════════════════════════════════════════════════════

  // Interview experiences
  { query: "McKinsey India interview experience campus hiring", firm: "mckinsey", firm_tier: "mbb", signal_type: "interview_experience", source_domain: "glassdoor.co.in", cadence: "biannual" },
  { query: "McKinsey India interview experience hiring entry level", firm: "mckinsey", firm_tier: "mbb", signal_type: "interview_experience", source_domain: "ambitionbox.com", cadence: "biannual" },
  { query: "McKinsey India interview experience consulting hiring", firm: "mckinsey", firm_tier: "mbb", signal_type: "interview_experience", source_domain: "preplounge.com", cadence: "biannual" },

  // Hiring criteria
  { query: "McKinsey India campus hiring profile what they look for", firm: "mckinsey", firm_tier: "mbb", signal_type: "hiring_criteria", source_domain: "casecoach.com", cadence: "quarterly" },
  { query: "McKinsey India shortlist criteria undergraduate consulting hiring", firm: "mckinsey", firm_tier: "mbb", signal_type: "hiring_criteria", source_domain: "preplounge.com", cadence: "quarterly" },
  { query: "McKinsey India consulting hiring profile site:reddit.com/r/IndianMBAs OR site:reddit.com/r/consulting", firm: "mckinsey", firm_tier: "mbb", signal_type: "hiring_criteria", cadence: "quarterly" },

  // Profile tips
  { query: "how I got into McKinsey India profile tips undergraduate", firm: "mckinsey", firm_tier: "mbb", signal_type: "profile_tip", source_domain: "medium.com", cadence: "biannual" },
  { query: "McKinsey India offer profile preparation tips what worked", firm: "mckinsey", firm_tier: "mbb", signal_type: "profile_tip", source_domain: "preplounge.com", cadence: "biannual" },

  // Process structure
  { query: "McKinsey Solve India undergraduate preparation what is tested", firm: "mckinsey", firm_tier: "mbb", signal_type: "process_structure", cadence: "biannual" },
  { query: "McKinsey India interview rounds process structure hiring", firm: "mckinsey", firm_tier: "mbb", signal_type: "process_structure", source_domain: "ambitionbox.com", cadence: "biannual" },


  // ════════════════════════════════════════════════════════════
  // MBB — BCG
  // 10 queries — deepest coverage
  // ════════════════════════════════════════════════════════════

  // Interview experiences
  { query: "BCG India interview experience campus hiring undergraduate", firm: "bcg", firm_tier: "mbb", signal_type: "interview_experience", source_domain: "glassdoor.co.in", cadence: "biannual" },
  { query: "BCG India interview experience hiring entry level", firm: "bcg", firm_tier: "mbb", signal_type: "interview_experience", source_domain: "ambitionbox.com", cadence: "biannual" },
  { query: "BCG India interview experience consulting hiring", firm: "bcg", firm_tier: "mbb", signal_type: "interview_experience", source_domain: "preplounge.com", cadence: "biannual" },

  // Hiring criteria
  { query: "BCG India campus hiring profile what they look for", firm: "bcg", firm_tier: "mbb", signal_type: "hiring_criteria", source_domain: "casecoach.com", cadence: "quarterly" },
  { query: "BCG India shortlist criteria undergraduate consulting hiring", firm: "bcg", firm_tier: "mbb", signal_type: "hiring_criteria", source_domain: "preplounge.com", cadence: "quarterly" },
  { query: "BCG India consulting hiring profile site:reddit.com/r/IndianMBAs OR site:reddit.com/r/consulting", firm: "bcg", firm_tier: "mbb", signal_type: "hiring_criteria", cadence: "quarterly" },

  // Profile tips
  { query: "how I got BCG India offer profile tips undergraduate", firm: "bcg", firm_tier: "mbb", signal_type: "profile_tip", source_domain: "medium.com", cadence: "biannual" },
  { query: "BCG India offer profile preparation tips what worked", firm: "bcg", firm_tier: "mbb", signal_type: "profile_tip", source_domain: "preplounge.com", cadence: "biannual" },

  // Process structure
  { query: "BCG India online case assessment interview process structure", firm: "bcg", firm_tier: "mbb", signal_type: "process_structure", cadence: "biannual" },
  { query: "BCG India interview rounds process structure hiring", firm: "bcg", firm_tier: "mbb", signal_type: "process_structure", source_domain: "ambitionbox.com", cadence: "biannual" },


  // ════════════════════════════════════════════════════════════
  // MBB — BAIN
  // 10 queries — deepest coverage
  // ════════════════════════════════════════════════════════════

  // Interview experiences
  { query: "Bain India interview experience campus undergraduate hiring", firm: "bain", firm_tier: "mbb", signal_type: "interview_experience", source_domain: "glassdoor.co.in", cadence: "biannual" },
  { query: "Bain India interview experience hiring entry level", firm: "bain", firm_tier: "mbb", signal_type: "interview_experience", source_domain: "ambitionbox.com", cadence: "biannual" },
  { query: "Bain India interview experience consulting hiring", firm: "bain", firm_tier: "mbb", signal_type: "interview_experience", source_domain: "preplounge.com", cadence: "biannual" },

  // Hiring criteria
  { query: "Bain India campus hiring profile what they look for", firm: "bain", firm_tier: "mbb", signal_type: "hiring_criteria", source_domain: "casecoach.com", cadence: "quarterly" },
  { query: "Bain India shortlist criteria undergraduate consulting hiring", firm: "bain", firm_tier: "mbb", signal_type: "hiring_criteria", source_domain: "preplounge.com", cadence: "quarterly" },
  { query: "Bain India consulting hiring profile site:reddit.com/r/IndianMBAs OR site:reddit.com/r/consulting", firm: "bain", firm_tier: "mbb", signal_type: "hiring_criteria", cadence: "quarterly" },

  // Profile tips
  { query: "how I got Bain India offer profile background what mattered", firm: "bain", firm_tier: "mbb", signal_type: "profile_tip", source_domain: "medium.com", cadence: "biannual" },
  { query: "Bain India offer profile preparation tips what worked", firm: "bain", firm_tier: "mbb", signal_type: "profile_tip", source_domain: "preplounge.com", cadence: "biannual" },

  // Process structure
  { query: "Bain India interview process rounds structure hiring", firm: "bain", firm_tier: "mbb", signal_type: "process_structure", source_domain: "ambitionbox.com", cadence: "biannual" },
  { query: "Bain India interview rounds process structure consulting", firm: "bain", firm_tier: "mbb", signal_type: "process_structure", source_domain: "preplounge.com", cadence: "biannual" },


  // ════════════════════════════════════════════════════════════
  // STRATEGY BOUTIQUES
  // 3 queries per firm — role agnostic
  // ════════════════════════════════════════════════════════════

  // Kearney
  { query: "Kearney India interview experience campus hiring", firm: "kearney", firm_tier: "strategy_boutique", signal_type: "interview_experience", source_domain: "ambitionbox.com", cadence: "biannual" },
  { query: "Kearney India shortlist profile criteria consulting hiring", firm: "kearney", firm_tier: "strategy_boutique", signal_type: "hiring_criteria", source_domain: "glassdoor.co.in", cadence: "biannual" },
  { query: "Kearney India interview process rounds what is tested", firm: "kearney", firm_tier: "strategy_boutique", signal_type: "process_structure", cadence: "biannual" },

  // EY-Parthenon
  { query: "EY Parthenon India interview experience campus hiring", firm: "ey_parthenon", firm_tier: "strategy_boutique", signal_type: "interview_experience", source_domain: "ambitionbox.com", cadence: "biannual" },
  { query: "EY Parthenon India hiring criteria profile shortlist consulting", firm: "ey_parthenon", firm_tier: "strategy_boutique", signal_type: "hiring_criteria", source_domain: "glassdoor.co.in", cadence: "biannual" },
  { query: "EY Parthenon India interview process rounds structure", firm: "ey_parthenon", firm_tier: "strategy_boutique", signal_type: "process_structure", cadence: "biannual" },

  // Accenture Strategy
  { query: "Accenture Strategy India interview experience campus hiring", firm: "accenture_strategy", firm_tier: "strategy_boutique", signal_type: "interview_experience", source_domain: "ambitionbox.com", cadence: "biannual" },
  { query: "Accenture Strategy India shortlist profile what they look for", firm: "accenture_strategy", firm_tier: "strategy_boutique", signal_type: "hiring_criteria", cadence: "biannual" },
  { query: "Accenture Strategy India interview process rounds structure", firm: "accenture_strategy", firm_tier: "strategy_boutique", signal_type: "process_structure", cadence: "biannual" },

  // Roland Berger
  { query: "Roland Berger India interview experience hiring consulting", firm: "roland_berger", firm_tier: "strategy_boutique", signal_type: "interview_experience", source_domain: "ambitionbox.com", cadence: "biannual" },
  { query: "Roland Berger India campus profile criteria shortlist consulting", firm: "roland_berger", firm_tier: "strategy_boutique", signal_type: "hiring_criteria", cadence: "biannual" },
  { query: "Roland Berger India interview process rounds structure", firm: "roland_berger", firm_tier: "strategy_boutique", signal_type: "process_structure", cadence: "biannual" },

  // Oliver Wyman
  { query: "Oliver Wyman India interview experience campus hiring", firm: "oliver_wyman", firm_tier: "strategy_boutique", signal_type: "interview_experience", source_domain: "ambitionbox.com", cadence: "biannual" },
  { query: "Oliver Wyman India hiring criteria profile shortlist consulting", firm: "oliver_wyman", firm_tier: "strategy_boutique", signal_type: "hiring_criteria", cadence: "biannual" },
  { query: "Oliver Wyman India interview process rounds structure", firm: "oliver_wyman", firm_tier: "strategy_boutique", signal_type: "process_structure", cadence: "biannual" },


  // ════════════════════════════════════════════════════════════
  // BIG 4
  // 3 queries per firm — role agnostic
  // ════════════════════════════════════════════════════════════

  // Deloitte S&O
  { query: "Deloitte Strategy Operations India interview experience campus hiring", firm: "deloitte_so", firm_tier: "big4", signal_type: "interview_experience", source_domain: "ambitionbox.com", cadence: "biannual" },
  { query: "Deloitte S&O India shortlist profile criteria consulting hiring", firm: "deloitte_so", firm_tier: "big4", signal_type: "hiring_criteria", source_domain: "glassdoor.co.in", cadence: "biannual" },
  { query: "Deloitte S&O India interview process rounds structure", firm: "deloitte_so", firm_tier: "big4", signal_type: "process_structure", cadence: "biannual" },

  // PwC Strategy&
  { query: "PwC Strategy India interview experience campus hiring shortlist", firm: "pwc_strategy", firm_tier: "big4", signal_type: "interview_experience", source_domain: "ambitionbox.com", cadence: "biannual" },
  { query: "PwC Strategy India profile criteria what they look for consulting", firm: "pwc_strategy", firm_tier: "big4", signal_type: "hiring_criteria", source_domain: "glassdoor.co.in", cadence: "biannual" },
  { query: "PwC Strategy India interview process rounds structure", firm: "pwc_strategy", firm_tier: "big4", signal_type: "process_structure", cadence: "biannual" },

  // KPMG
  { query: "KPMG management consulting India interview experience campus hiring", firm: "kpmg", firm_tier: "big4", signal_type: "interview_experience", source_domain: "ambitionbox.com", cadence: "biannual" },
  { query: "KPMG India shortlist profile hiring criteria consulting", firm: "kpmg", firm_tier: "big4", signal_type: "hiring_criteria", source_domain: "glassdoor.co.in", cadence: "biannual" },
  { query: "KPMG India consulting interview process rounds what tested", firm: "kpmg", firm_tier: "big4", signal_type: "process_structure", cadence: "biannual" },


  // ════════════════════════════════════════════════════════════
  // SOCIAL & GOVERNANCE
  // Samagra gets 5, others get 3
  // ════════════════════════════════════════════════════════════

  // Samagra
  { query: "Samagra Governance interview experience hiring process", firm: "samagra", firm_tier: "social_governance", signal_type: "interview_experience", source_domain: "glassdoor.co.in", cadence: "biannual" },
  { query: "Samagra Governance interview experience hiring entry level", firm: "samagra", firm_tier: "social_governance", signal_type: "interview_experience", source_domain: "ambitionbox.com", cadence: "biannual" },
  { query: "Samagra Governance concept note round what is tested hiring", firm: "samagra", firm_tier: "social_governance", signal_type: "process_structure", cadence: "biannual" },
  { query: "how to get into Samagra Governance profile tips preparation", firm: "samagra", firm_tier: "social_governance", signal_type: "profile_tip", source_domain: "medium.com", cadence: "biannual" },
  { query: "Samagra Governance hiring criteria profile what they look for", firm: "samagra", firm_tier: "social_governance", signal_type: "hiring_criteria", source_domain: "managementconsulted.com", cadence: "quarterly" },

  // Dalberg
  { query: "Dalberg India interview experience hiring consulting process", firm: "dalberg", firm_tier: "social_governance", signal_type: "interview_experience", source_domain: "ambitionbox.com", cadence: "biannual" },
  { query: "Dalberg India profile criteria what they look for consulting", firm: "dalberg", firm_tier: "social_governance", signal_type: "hiring_criteria", cadence: "biannual" },
  { query: "how to get into Dalberg India consulting tips preparation", firm: "dalberg", firm_tier: "social_governance", signal_type: "profile_tip", source_domain: "medium.com", cadence: "biannual" },

  // IDinsight
  { query: "IDinsight India interview experience hiring consulting", firm: "idinsight", firm_tier: "social_governance", signal_type: "interview_experience", source_domain: "ambitionbox.com", cadence: "biannual" },
  { query: "IDinsight India profile criteria what they look for consulting", firm: "idinsight", firm_tier: "social_governance", signal_type: "hiring_criteria", cadence: "biannual" },
  { query: "IDinsight India interview process rounds structure selection", firm: "idinsight", firm_tier: "social_governance", signal_type: "process_structure", cadence: "biannual" },

  // Sattva
  { query: "Sattva Consulting India interview experience hiring process", firm: "sattva", firm_tier: "social_governance", signal_type: "interview_experience", source_domain: "ambitionbox.com", cadence: "biannual" },
  { query: "Sattva Consulting India profile criteria what they look for", firm: "sattva", firm_tier: "social_governance", signal_type: "hiring_criteria", cadence: "biannual" },


  // ════════════════════════════════════════════════════════════
  // INDIAN BOUTIQUES
  // 2 queries per firm — role agnostic
  // ════════════════════════════════════════════════════════════

  { query: "RedSeer Consulting India interview experience hiring consulting", firm: "redseer", firm_tier: "indian_boutique", signal_type: "interview_experience", source_domain: "ambitionbox.com", cadence: "biannual" },
  { query: "RedSeer India shortlist profile criteria consulting hiring", firm: "redseer", firm_tier: "indian_boutique", signal_type: "hiring_criteria", cadence: "biannual" },

  { query: "Praxis Global Alliance India interview experience campus hiring", firm: "praxis", firm_tier: "indian_boutique", signal_type: "interview_experience", source_domain: "ambitionbox.com", cadence: "biannual" },
  { query: "Praxis Global Alliance India profile criteria what they look for", firm: "praxis", firm_tier: "indian_boutique", signal_type: "hiring_criteria", cadence: "biannual" },

  { query: "ZS Associates India interview experience campus hiring consulting", firm: "zs_associates", firm_tier: "indian_boutique", signal_type: "interview_experience", source_domain: "ambitionbox.com", cadence: "biannual" },
  { query: "ZS Associates India shortlist profile criteria consulting hiring", firm: "zs_associates", firm_tier: "indian_boutique", signal_type: "hiring_criteria", cadence: "biannual" },

  { query: "Kepler Cannon India interview experience hiring consulting", firm: "kepler_cannon", firm_tier: "indian_boutique", signal_type: "interview_experience", source_domain: "ambitionbox.com", cadence: "biannual" },
  { query: "Kepler Cannon India profile criteria what they look for consulting", firm: "kepler_cannon", firm_tier: "indian_boutique", signal_type: "hiring_criteria", cadence: "biannual" },


  // ════════════════════════════════════════════════════════════
  // CONSULTING CLUB RESOURCES
  // Broad India-specific signal — firm agnostic
  // ════════════════════════════════════════════════════════════

  { query: "IIM Ahmedabad consulting club placement prep McKinsey BCG Bain India", firm: "all_mbb", firm_tier: "mbb", signal_type: "hiring_criteria", cadence: "biannual" },
  { query: "IIM Bangalore consulting club interview preparation India MBB", firm: "all_mbb", firm_tier: "mbb", signal_type: "hiring_criteria", cadence: "biannual" },
  { query: "SRCC consulting club case competition placement consulting firms India", firm: "all_mbb", firm_tier: "mbb", signal_type: "hiring_criteria", cadence: "biannual" },
  { query: "how I cleared McKinsey India consulting interview rounds case and fit", firm: "mckinsey", firm_tier: "mbb", signal_type: "interview_experience", source_domain: "medium.com", cadence: "quarterly" },
  { query: "how I cleared BCG India consulting interview rounds case and fit", firm: "bcg", firm_tier: "mbb", signal_type: "interview_experience", source_domain: "medium.com", cadence: "quarterly" },
  { query: "how I cleared Bain India consulting interview rounds case and fit", firm: "bain", firm_tier: "mbb", signal_type: "interview_experience", source_domain: "medium.com", cadence: "quarterly" },
  { query: "consulting interview process in India round by round experience", firm: "all_mbb", firm_tier: "mbb", signal_type: "process_structure", source_domain: "medium.com", cadence: "quarterly" },
  { query: "India consulting placement interview experience personal journey case interview", firm: "all_tiers", firm_tier: "mbb", signal_type: "interview_experience", source_domain: "medium.com", cadence: "quarterly" },
  { query: "consulting India undergraduate placement profile tips preparation", firm: "all_tiers", firm_tier: "mbb", signal_type: "profile_tip", source_domain: "medium.com", cadence: "quarterly" },
  { query: "180 degrees consulting India placement tips profile undergraduate", firm: "all_tiers", firm_tier: "mbb", signal_type: "profile_tip", cadence: "biannual" },

];

export const QUERIES: QueryConfig[] = BASE_QUERIES.map((q) => {
  if (q.signal_type === "hiring_criteria") {
    return { ...q, cadence: "monthly" };
  }
  if (
    q.signal_type === "interview_experience" ||
    q.signal_type === "process_structure"
  ) {
    return { ...q, cadence: "quarterly" };
  }
  return q; // Keep profile_tip cadence unchanged.
});

export const CAREERS_PAGES = [
  { url: "https://www.mckinsey.com/careers/students", firm: "mckinsey" },
  { url: "https://www.bcg.com/careers/students", firm: "bcg" },
  { url: "https://www.bain.com/careers/students", firm: "bain" },
  { url: "https://www.kearney.com/careers", firm: "kearney" },
  { url: "https://samagragovernance.in/joinus", firm: "samagra" },
  { url: "https://dalberg.com/join-us/", firm: "dalberg" },
  { url: "https://idinsight.org/careers/", firm: "idinsight" },
];
