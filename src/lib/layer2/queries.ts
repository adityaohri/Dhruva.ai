export interface QueryConfig {
  query: string;
  firm: string;
  firm_tier:
    | "mbb"
    | "strategy_boutique"
    | "big4"
    | "social_governance"
    | "indian_boutique";
  signal_type:
    | "interview_experience"
    | "hiring_criteria"
    | "process_structure"
    | "profile_tip";
  source_domain?: string;
  cadence: "monthly" | "quarterly" | "biannual";
}

export const QUERIES: QueryConfig[] = [
  // ── MBB — McKINSEY ──────────────────────────────────────────────────
  {
    query:
      "McKinsey India analyst interview experience undergraduate shortlist",
    firm: "mckinsey",
    firm_tier: "mbb",
    signal_type: "interview_experience",
    source_domain: "glassdoor.co.in",
    cadence: "biannual",
  },
  {
    query: "McKinsey India campus hiring profile what they look for",
    firm: "mckinsey",
    firm_tier: "mbb",
    signal_type: "hiring_criteria",
    source_domain: "reddit.com",
    cadence: "quarterly",
  },
  {
    query: "how I got into McKinsey India undergraduate profile tips",
    firm: "mckinsey",
    firm_tier: "mbb",
    signal_type: "profile_tip",
    source_domain: "medium.com",
    cadence: "biannual",
  },
  {
    query: "McKinsey India shortlist criteria undergraduate analyst",
    firm: "mckinsey",
    firm_tier: "mbb",
    signal_type: "hiring_criteria",
    source_domain: "quora.com",
    cadence: "quarterly",
  },
  {
    query: "McKinsey Solve India undergraduate preparation what is tested",
    firm: "mckinsey",
    firm_tier: "mbb",
    signal_type: "process_structure",
    cadence: "biannual",
  },
  {
    query: "McKinsey India analyst interview rounds process structure",
    firm: "mckinsey",
    firm_tier: "mbb",
    signal_type: "process_structure",
    source_domain: "ambitionbox.com",
    cadence: "biannual",
  },

  // ── MBB — BCG ────────────────────────────────────────────────────────
  {
    query: "BCG India analyst interview experience campus hiring undergraduate",
    firm: "bcg",
    firm_tier: "mbb",
    signal_type: "interview_experience",
    source_domain: "glassdoor.co.in",
    cadence: "biannual",
  },
  {
    query: "BCG India campus hiring profile what they look for",
    firm: "bcg",
    firm_tier: "mbb",
    signal_type: "hiring_criteria",
    source_domain: "reddit.com",
    cadence: "quarterly",
  },
  {
    query: "how I got BCG India offer undergraduate profile tips",
    firm: "bcg",
    firm_tier: "mbb",
    signal_type: "profile_tip",
    source_domain: "medium.com",
    cadence: "biannual",
  },
  {
    query: "BCG India online case assessment interview process structure rounds",
    firm: "bcg",
    firm_tier: "mbb",
    signal_type: "process_structure",
    cadence: "biannual",
  },
  {
    query: "BCG India campus placement shortlist criteria analyst",
    firm: "bcg",
    firm_tier: "mbb",
    signal_type: "hiring_criteria",
    source_domain: "quora.com",
    cadence: "quarterly",
  },
  {
    query: "BCG Platinion BCG X India hiring undergraduate profile",
    firm: "bcg",
    firm_tier: "mbb",
    signal_type: "hiring_criteria",
    cadence: "biannual",
  },

  // ── MBB — BAIN ───────────────────────────────────────────────────────
  {
    query: "Bain India analyst interview experience campus undergraduate",
    firm: "bain",
    firm_tier: "mbb",
    signal_type: "interview_experience",
    source_domain: "glassdoor.co.in",
    cadence: "biannual",
  },
  {
    query: "Bain India campus hiring profile what they look for",
    firm: "bain",
    firm_tier: "mbb",
    signal_type: "hiring_criteria",
    source_domain: "reddit.com",
    cadence: "quarterly",
  },
  {
    query: "how I got Bain India offer profile background what mattered",
    firm: "bain",
    firm_tier: "mbb",
    signal_type: "profile_tip",
    source_domain: "medium.com",
    cadence: "biannual",
  },
  {
    query: "Bain India interview process rounds structure associate consultant",
    firm: "bain",
    firm_tier: "mbb",
    signal_type: "process_structure",
    source_domain: "ambitionbox.com",
    cadence: "biannual",
  },
  {
    query: "Bain India campus recruitment shortlist criteria analyst",
    firm: "bain",
    firm_tier: "mbb",
    signal_type: "hiring_criteria",
    source_domain: "quora.com",
    cadence: "quarterly",
  },

  // ── STRATEGY BOUTIQUES — KEARNEY ─────────────────────────────────────
  {
    query: "Kearney India interview experience analyst campus hiring",
    firm: "kearney",
    firm_tier: "strategy_boutique",
    signal_type: "interview_experience",
    source_domain: "ambitionbox.com",
    cadence: "biannual",
  },
  {
    query: "Kearney India shortlist profile criteria analyst",
    firm: "kearney",
    firm_tier: "strategy_boutique",
    signal_type: "hiring_criteria",
    cadence: "biannual",
  },
  {
    query: "Kearney India interview process rounds what is tested",
    firm: "kearney",
    firm_tier: "strategy_boutique",
    signal_type: "process_structure",
    source_domain: "glassdoor.co.in",
    cadence: "biannual",
  },

  // ── STRATEGY BOUTIQUES — EY-PARTHENON ────────────────────────────────
  {
    query: "EY Parthenon India interview experience analyst campus",
    firm: "ey_parthenon",
    firm_tier: "strategy_boutique",
    signal_type: "interview_experience",
    source_domain: "ambitionbox.com",
    cadence: "biannual",
  },
  {
    query: "EY Parthenon India hiring criteria profile shortlist analyst",
    firm: "ey_parthenon",
    firm_tier: "strategy_boutique",
    signal_type: "hiring_criteria",
    cadence: "biannual",
  },
  {
    query: "EY Parthenon India interview process rounds structure",
    firm: "ey_parthenon",
    firm_tier: "strategy_boutique",
    signal_type: "process_structure",
    cadence: "biannual",
  },

  // ── STRATEGY BOUTIQUES — ACCENTURE STRATEGY ──────────────────────────
  {
    query: "Accenture Strategy India interview experience campus analyst",
    firm: "accenture_strategy",
    firm_tier: "strategy_boutique",
    signal_type: "interview_experience",
    source_domain: "ambitionbox.com",
    cadence: "biannual",
  },
  {
    query: "Accenture Strategy India shortlist profile what they look for",
    firm: "accenture_strategy",
    firm_tier: "strategy_boutique",
    signal_type: "hiring_criteria",
    cadence: "biannual",
  },
  {
    query: "Accenture Strategy India interview process rounds structure",
    firm: "accenture_strategy",
    firm_tier: "strategy_boutique",
    signal_type: "process_structure",
    cadence: "biannual",
  },

  // ── STRATEGY BOUTIQUES — ROLAND BERGER ───────────────────────────────
  {
    query: "Roland Berger India interview experience analyst hiring",
    firm: "roland_berger",
    firm_tier: "strategy_boutique",
    signal_type: "interview_experience",
    cadence: "biannual",
  },
  {
    query: "Roland Berger India campus profile criteria analyst shortlist",
    firm: "roland_berger",
    firm_tier: "strategy_boutique",
    signal_type: "hiring_criteria",
    cadence: "biannual",
  },

  // ── STRATEGY BOUTIQUES — OLIVER WYMAN ────────────────────────────────
  {
    query: "Oliver Wyman India interview experience analyst campus",
    firm: "oliver_wyman",
    firm_tier: "strategy_boutique",
    signal_type: "interview_experience",
    cadence: "biannual",
  },
  {
    query: "Oliver Wyman India hiring criteria profile analyst shortlist",
    firm: "oliver_wyman",
    firm_tier: "strategy_boutique",
    signal_type: "hiring_criteria",
    cadence: "biannual",
  },

  // ── BIG 4 — DELOITTE S&O ─────────────────────────────────────────────
  {
    query:
      "Deloitte Strategy Operations India interview experience campus analyst",
    firm: "deloitte_so",
    firm_tier: "big4",
    signal_type: "interview_experience",
    source_domain: "ambitionbox.com",
    cadence: "biannual",
  },
  {
    query: "Deloitte S&O India shortlist profile criteria analyst hiring",
    firm: "deloitte_so",
    firm_tier: "big4",
    signal_type: "hiring_criteria",
    cadence: "biannual",
  },
  {
    query: "Deloitte S&O India interview process rounds structure",
    firm: "deloitte_so",
    firm_tier: "big4",
    signal_type: "process_structure",
    cadence: "biannual",
  },

  // ── BIG 4 — PWC STRATEGY& ────────────────────────────────────────────
  {
    query: "PwC Strategy India interview experience campus analyst shortlist",
    firm: "pwc_strategy",
    firm_tier: "big4",
    signal_type: "interview_experience",
    source_domain: "ambitionbox.com",
    cadence: "biannual",
  },
  {
    query: "PwC Strategy India profile criteria what they look for analyst",
    firm: "pwc_strategy",
    firm_tier: "big4",
    signal_type: "hiring_criteria",
    cadence: "biannual",
  },
  {
    query: "PwC Strategy India interview process rounds structure",
    firm: "pwc_strategy",
    firm_tier: "big4",
    signal_type: "process_structure",
    cadence: "biannual",
  },

  // ── BIG 4 — KPMG ─────────────────────────────────────────────────────
  {
    query: "KPMG management consulting India interview experience campus",
    firm: "kpmg",
    firm_tier: "big4",
    signal_type: "interview_experience",
    source_domain: "ambitionbox.com",
    cadence: "biannual",
  },
  {
    query: "KPMG India analyst shortlist profile hiring criteria",
    firm: "kpmg",
    firm_tier: "big4",
    signal_type: "hiring_criteria",
    cadence: "biannual",
  },
  {
    query: "KPMG India consulting interview process rounds what tested",
    firm: "kpmg",
    firm_tier: "big4",
    signal_type: "process_structure",
    cadence: "biannual",
  },

  // ── SOCIAL & GOVERNANCE — SAMAGRA ────────────────────────────────────
  {
    query: "Samagra Governance interview experience hiring process",
    firm: "samagra",
    firm_tier: "social_governance",
    signal_type: "interview_experience",
    source_domain: "glassdoor.co.in",
    cadence: "biannual",
  },
  {
    query: "Samagra Governance concept note round what is tested hiring",
    firm: "samagra",
    firm_tier: "social_governance",
    signal_type: "process_structure",
    cadence: "biannual",
  },
  {
    query: "how to get into Samagra Governance profile tips preparation",
    firm: "samagra",
    firm_tier: "social_governance",
    signal_type: "profile_tip",
    cadence: "biannual",
  },
  {
    query: "Samagra Governance hiring criteria what profile they look for",
    firm: "samagra",
    firm_tier: "social_governance",
    signal_type: "hiring_criteria",
    source_domain: "quora.com",
    cadence: "quarterly",
  },
  {
    query: "Samagra Governance interview process rounds structure selection",
    firm: "samagra",
    firm_tier: "social_governance",
    signal_type: "process_structure",
    source_domain: "ambitionbox.com",
    cadence: "biannual",
  },

  // ── SOCIAL & GOVERNANCE — DALBERG ────────────────────────────────────
  {
    query: "Dalberg India interview experience analyst hiring process",
    firm: "dalberg",
    firm_tier: "social_governance",
    signal_type: "interview_experience",
    cadence: "biannual",
  },
  {
    query: "Dalberg India profile criteria what they look for analyst",
    firm: "dalberg",
    firm_tier: "social_governance",
    signal_type: "hiring_criteria",
    cadence: "biannual",
  },
  {
    query: "how to get into Dalberg India consulting tips preparation",
    firm: "dalberg",
    firm_tier: "social_governance",
    signal_type: "profile_tip",
    source_domain: "medium.com",
    cadence: "biannual",
  },
  {
    query: "Dalberg India interview process rounds structure selection",
    firm: "dalberg",
    firm_tier: "social_governance",
    signal_type: "process_structure",
    cadence: "biannual",
  },

  // ── SOCIAL & GOVERNANCE — IDINSIGHT ──────────────────────────────────
  {
    query: "IDinsight India interview experience hiring analyst",
    firm: "idinsight",
    firm_tier: "social_governance",
    signal_type: "interview_experience",
    cadence: "biannual",
  },
  {
    query: "IDinsight India profile criteria what they look for analyst",
    firm: "idinsight",
    firm_tier: "social_governance",
    signal_type: "hiring_criteria",
    cadence: "biannual",
  },
  {
    query: "IDinsight India interview process rounds structure selection",
    firm: "idinsight",
    firm_tier: "social_governance",
    signal_type: "process_structure",
    cadence: "biannual",
  },

  // ── SOCIAL & GOVERNANCE — SATTVA ─────────────────────────────────────
  {
    query: "Sattva Consulting India interview experience hiring process",
    firm: "sattva",
    firm_tier: "social_governance",
    signal_type: "interview_experience",
    source_domain: "ambitionbox.com",
    cadence: "biannual",
  },
  {
    query: "Sattva Consulting India profile criteria what they look for",
    firm: "sattva",
    firm_tier: "social_governance",
    signal_type: "hiring_criteria",
    cadence: "biannual",
  },

  // ── INDIAN BOUTIQUES — REDSEER ───────────────────────────────────────
  {
    query: "RedSeer Consulting India interview experience analyst hiring",
    firm: "redseer",
    firm_tier: "indian_boutique",
    signal_type: "interview_experience",
    source_domain: "ambitionbox.com",
    cadence: "biannual",
  },
  {
    query: "RedSeer India shortlist profile criteria analyst",
    firm: "redseer",
    firm_tier: "indian_boutique",
    signal_type: "hiring_criteria",
    cadence: "biannual",
  },

  // ── INDIAN BOUTIQUES — PRAXIS ────────────────────────────────────────
  {
    query: "Praxis Global Alliance India interview experience analyst campus",
    firm: "praxis",
    firm_tier: "indian_boutique",
    signal_type: "interview_experience",
    source_domain: "ambitionbox.com",
    cadence: "biannual",
  },
  {
    query: "Praxis Global Alliance India profile criteria what they look for",
    firm: "praxis",
    firm_tier: "indian_boutique",
    signal_type: "hiring_criteria",
    cadence: "biannual",
  },

  // ── INDIAN BOUTIQUES — ZS ASSOCIATES ─────────────────────────────────
  {
    query: "ZS Associates India interview experience analyst campus hiring",
    firm: "zs_associates",
    firm_tier: "indian_boutique",
    signal_type: "interview_experience",
    source_domain: "ambitionbox.com",
    cadence: "biannual",
  },
  {
    query: "ZS Associates India shortlist profile criteria analyst",
    firm: "zs_associates",
    firm_tier: "indian_boutique",
    signal_type: "hiring_criteria",
    cadence: "biannual",
  },

  // ── INDIAN BOUTIQUES — KEPLER CANNON ─────────────────────────────────
  {
    query: "Kepler Cannon India interview experience analyst hiring",
    firm: "kepler_cannon",
    firm_tier: "indian_boutique",
    signal_type: "interview_experience",
    cadence: "biannual",
  },
  {
    query: "Kepler Cannon India profile criteria what they look for analyst",
    firm: "kepler_cannon",
    firm_tier: "indian_boutique",
    signal_type: "hiring_criteria",
    cadence: "biannual",
  },

  // ── CONSULTING CLUB RESOURCES ─────────────────────────────────────────
  {
    query:
      "IIM Ahmedabad consulting club placement prep McKinsey BCG Bain India",
    firm: "all_mbb",
    firm_tier: "mbb",
    signal_type: "hiring_criteria",
    cadence: "biannual",
  },
  {
    query: "IIM Bangalore consulting club interview preparation India MBB",
    firm: "all_mbb",
    firm_tier: "mbb",
    signal_type: "hiring_criteria",
    cadence: "biannual",
  },
  {
    query:
      "SRCC consulting club case competition placement consulting firms India",
    firm: "all_mbb",
    firm_tier: "mbb",
    signal_type: "hiring_criteria",
    cadence: "biannual",
  },
  {
    query: "consulting placement preparation India undergraduate profile tips",
    firm: "all_tiers",
    firm_tier: "mbb",
    signal_type: "profile_tip",
    source_domain: "quora.com",
    cadence: "quarterly",
  },
  {
    query: "180 degrees consulting India placement tips profile undergraduate",
    firm: "all_tiers",
    firm_tier: "mbb",
    signal_type: "profile_tip",
    cadence: "biannual",
  },
];

export const CAREERS_PAGES = [
  { url: "https://www.mckinsey.com/careers/students", firm: "mckinsey" },
  { url: "https://www.bcg.com/careers/students", firm: "bcg" },
  { url: "https://www.bain.com/careers/students", firm: "bain" },
  { url: "https://www.kearney.com/careers", firm: "kearney" },
  { url: "https://samagragovernance.in/joinus", firm: "samagra" },
  { url: "https://dalberg.com/join-us/", firm: "dalberg" },
  { url: "https://idinsight.org/careers/", firm: "idinsight" },
] as const;
