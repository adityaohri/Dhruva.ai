export interface JDQueryConfig {
  query: string;
  firm: string;
  firm_tier:
    | "mbb"
    | "strategy_boutique"
    | "big4"
    | "social_governance"
    | "indian_boutique";
}

// Target 15-20 JDs per firm across MBB
// These are searched via Exa — results are actual job posting pages
export const JD_QUERIES: JDQueryConfig[] = [
  // ── MBB — McKINSEY ──────────────────────────────────────────
  {
    query:
      "McKinsey India consulting job description responsibilities skills requirements",
    firm: "mckinsey",
    firm_tier: "mbb",
  },
  {
    query:
      "McKinsey & Company India entry level consulting role skills qualifications",
    firm: "mckinsey",
    firm_tier: "mbb",
  },
  {
    query: "McKinsey India business analyst job description requirements",
    firm: "mckinsey",
    firm_tier: "mbb",
  },
  {
    query: "McKinsey India associate consultant job posting skills",
    firm: "mckinsey",
    firm_tier: "mbb",
  },

  // ── MBB — BCG ────────────────────────────────────────────────
  {
    query:
      "BCG India consulting job description responsibilities skills requirements",
    firm: "bcg",
    firm_tier: "mbb",
  },
  {
    query:
      "Boston Consulting Group India entry level role skills qualifications",
    firm: "bcg",
    firm_tier: "mbb",
  },
  {
    query: "BCG India associate job description requirements skills",
    firm: "bcg",
    firm_tier: "mbb",
  },
  {
    query: "BCG India consulting position job posting qualifications",
    firm: "bcg",
    firm_tier: "mbb",
  },

  // ── MBB — BAIN ───────────────────────────────────────────────
  {
    query:
      "Bain India consulting job description responsibilities skills requirements",
    firm: "bain",
    firm_tier: "mbb",
  },
  {
    query:
      "Bain & Company India entry level consulting role qualifications",
    firm: "bain",
    firm_tier: "mbb",
  },
  {
    query: "Bain India associate consultant job description skills",
    firm: "bain",
    firm_tier: "mbb",
  },
  {
    query: "Bain India consulting position job posting requirements",
    firm: "bain",
    firm_tier: "mbb",
  },

  // ── STRATEGY BOUTIQUES ───────────────────────────────────────
  {
    query: "Kearney India consulting job description skills requirements",
    firm: "kearney",
    firm_tier: "strategy_boutique",
  },
  {
    query:
      "EY Parthenon India consulting job description skills qualifications",
    firm: "ey_parthenon",
    firm_tier: "strategy_boutique",
  },
  {
    query:
      "Accenture Strategy India consulting job description requirements skills",
    firm: "accenture_strategy",
    firm_tier: "strategy_boutique",
  },
  {
    query:
      "Roland Berger India consulting job description skills requirements",
    firm: "roland_berger",
    firm_tier: "strategy_boutique",
  },
  {
    query:
      "Oliver Wyman India consulting job description skills qualifications",
    firm: "oliver_wyman",
    firm_tier: "strategy_boutique",
  },

  // ── BIG 4 ────────────────────────────────────────────────────
  {
    query:
      "Deloitte Strategy Operations India job description skills requirements",
    firm: "deloitte_so",
    firm_tier: "big4",
  },
  {
    query: "PwC Strategy India consulting job description skills qualifications",
    firm: "pwc_strategy",
    firm_tier: "big4",
  },
  {
    query:
      "KPMG India management consulting job description skills requirements",
    firm: "kpmg",
    firm_tier: "big4",
  },

  // ── SOCIAL & GOVERNANCE ──────────────────────────────────────
  {
    query: "Samagra Governance job description skills requirements qualifications",
    firm: "samagra",
    firm_tier: "social_governance",
  },
  {
    query: "Dalberg India job description skills requirements consulting",
    firm: "dalberg",
    firm_tier: "social_governance",
  },
  {
    query: "IDinsight India job description skills requirements",
    firm: "idinsight",
    firm_tier: "social_governance",
  },

  // ── INDIAN BOUTIQUES ─────────────────────────────────────────
  {
    query: "RedSeer Consulting India job description skills requirements",
    firm: "redseer",
    firm_tier: "indian_boutique",
  },
  {
    query: "Praxis Global Alliance India job description skills requirements",
    firm: "praxis",
    firm_tier: "indian_boutique",
  },
  {
    query: "ZS Associates India job description skills qualifications",
    firm: "zs_associates",
    firm_tier: "indian_boutique",
  },
];

// Firm tiers to compute matrix for
export const FIRM_TIERS = [
  "mbb",
  "strategy_boutique",
  "big4",
  "social_governance",
  "indian_boutique",
] as const;
