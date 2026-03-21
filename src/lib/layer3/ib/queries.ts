export interface JDQueryConfig {
  query: string;
  firm: string;
  firm_tier: "bulge_bracket" | "elite_boutique" | "india_focused";
}

export const JD_QUERIES: JDQueryConfig[] = [
  { query: "Goldman Sachs India investment banking job description skills requirements", firm: "goldman_sachs", firm_tier: "bulge_bracket" },
  { query: "Goldman Sachs India IB entry level role qualifications skills", firm: "goldman_sachs", firm_tier: "bulge_bracket" },
  { query: "JP Morgan India investment banking job description skills requirements", firm: "jpmorgan", firm_tier: "bulge_bracket" },
  { query: "JP Morgan India IB entry level role qualifications skills", firm: "jpmorgan", firm_tier: "bulge_bracket" },
  { query: "Morgan Stanley India investment banking job description requirements skills", firm: "morgan_stanley", firm_tier: "bulge_bracket" },
  { query: "Morgan Stanley India IB role qualifications skills entry level", firm: "morgan_stanley", firm_tier: "bulge_bracket" },
  { query: "Bank of America India investment banking job description skills", firm: "bofa", firm_tier: "bulge_bracket" },
  { query: "Citi India investment banking job description skills requirements", firm: "citi", firm_tier: "bulge_bracket" },
  { query: "Deutsche Bank India investment banking job description skills", firm: "deutsche_bank", firm_tier: "bulge_bracket" },
  { query: "Jefferies India investment banking job description skills requirements", firm: "jefferies", firm_tier: "bulge_bracket" },
  { query: "HSBC India investment banking job description skills requirements", firm: "hsbc", firm_tier: "bulge_bracket" },
  { query: "Lazard India investment banking job description skills requirements", firm: "lazard", firm_tier: "elite_boutique" },
  { query: "Rothschild India investment banking job description skills qualifications", firm: "rothschild", firm_tier: "elite_boutique" },
  { query: "Evercore India investment banking job description skills requirements", firm: "evercore", firm_tier: "elite_boutique" },
  { query: "Houlihan Lokey India investment banking job description skills", firm: "houlihan_lokey", firm_tier: "elite_boutique" },
  { query: "Kotak Investment Banking India job description skills requirements qualifications", firm: "kotak_ib", firm_tier: "india_focused" },
  { query: "Kotak IB India entry level role skills qualifications", firm: "kotak_ib", firm_tier: "india_focused" },
  { query: "Avendus Capital India investment banking job description skills requirements", firm: "avendus", firm_tier: "india_focused" },
  { query: "Avendus Capital India IB role qualifications skills entry level", firm: "avendus", firm_tier: "india_focused" },
  { query: "Axis Capital India investment banking job description skills requirements", firm: "axis_capital", firm_tier: "india_focused" },
  { query: "ICICI Securities India investment banking job description skills requirements", firm: "icici_securities", firm_tier: "india_focused" },
  { query: "JM Financial India investment banking job description skills", firm: "jm_financial", firm_tier: "india_focused" },
  { query: "SBI Capital Markets India investment banking job description skills", firm: "sbicaps", firm_tier: "india_focused" },
];

export const FIRM_TIERS = [
  "bulge_bracket",
  "elite_boutique",
  "india_focused",
] as const;
