/**
 * signalSources.ts
 *
 * Comprehensive signal intelligence repository for Dhruva.ai.
 * Powers two distinct modes:
 *   1. INDUSTRY MODE — user selects 1+ of 22 industries; we surface
 *      broad hiring signals across companies in that space.
 *   2. WATCHLIST MODE — user pins specific companies; we surface
 *      time-sensitive signals for exactly those companies so they
 *      can personalise cold outreach via email or LinkedIn.
 *
 * Signal types (10):
 *   funding | leadership | geography | product_launch | contract_win
 *   headcount | workstream | regulatory | virality | job_posting_surge
 *
 * Every export here feeds into:
 *   - supabase/functions/index-signals/index.ts  (background cron, Exa queries)
 *   - src/lib/signalClassifier.ts                (Claude Haiku classifier)
 *   - src/components/SignalFeed.tsx              (UI labels, emojis, colours)
 */

// ─────────────────────────────────────────────────────────────────────────────
// SIGNAL TYPE DEFINITION
// ─────────────────────────────────────────────────────────────────────────────

export type SignalType =
  | "funding"
  | "leadership"
  | "geography"
  | "product_launch"
  | "contract_win"
  | "headcount"
  | "workstream"
  | "regulatory"
  | "virality"
  | "job_posting_surge"

// ─────────────────────────────────────────────────────────────────────────────
// CREDIBLE INDIAN SIGNAL SOURCES
// Passed to Exa as includeDomains to ensure source quality.
// ─────────────────────────────────────────────────────────────────────────────

export const INDIAN_SIGNAL_SOURCES: string[] = [
  // ── Startup & Venture ecosystem ──────────────────────────────────────────
  "inc42.com",
  "entrackr.com",
  "yourstory.com",
  "thecKen.co",
  "foundingfuel.com",
  "themorningcontext.com",
  "startupstorymedia.com",
  "vccircle.com",
  "dealstreetasia.com",
  "ivca.in",
  "nasscom.in",

  // ── Business & Corporate news ─────────────────────────────────────────────
  "economictimes.indiatimes.com",
  "businessstandard.com",
  "livemint.com",
  "moneycontrol.com",
  "fortuneindia.com",
  "financialexpress.com",
  "thehindu.com",
  "business-today.com",
  "cnbctv18.com",
  "bloombergquint.com",
  "ndtv.com",

  // ── Tech & Product news ───────────────────────────────────────────────────
  "techcrunch.com",
  "medianama.com",
  "gadgets360.com",
  "digit.in",
  "thenextweb.com",
  "venturebeat.com",
  "analytics-india.in",
  "analyticsindiamag.com",

  // ── FMCG, Retail & Consumer ───────────────────────────────────────────────
  "afaqs.com",
  "exchange4media.com",
  "campaignindia.in",
  "indiaretailing.com",
  "retailnews.asia",

  // ── Pharma & Healthcare ───────────────────────────────────────────────────
  "pharmabiz.com",
  "expresspharma.com",
  "healthcareradius.com",
  "etpharma.com",
  "clinicalleader.com",

  // ── Energy & Infrastructure ───────────────────────────────────────────────
  "mercom.in",
  "saurenergy.com",
  "windinsider.com",
  "infrastructureinvestor.com",
  "constructionworld.in",
  "powergridcorp.com",
  "pib.gov.in",

  // ── Legal & Compliance ────────────────────────────────────────────────────
  "barandbench.com",
  "livelaw.in",
  "legallyindia.com",
  "indiacorplaw.in",

  // ── Manufacturing & Automotive ────────────────────────────────────────────
  "autocarindia.com",
  "overdrive.in",
  "motorindia.in",
  "automotivedive.com",
  "autonewsmart.com",
  "smeindia.org",

  // ── Logistics & Supply Chain ──────────────────────────────────────────────
  "cargotalk.in",
  "logisticsinside.com",
  "transportationtodayindia.com",

  // ── Edtech ───────────────────────────────────────────────────────────────
  "edsurge.com",
  "edtechreview.in",

  // ── Real Estate ──────────────────────────────────────────────────────────
  "99acres.com",
  "proptiger.com",
  "housing.com",
  "jll.com",
  "cushmanwakefield.com",

  // ── Government & Regulatory ───────────────────────────────────────────────
  "sebi.gov.in",
  "rbi.org.in",
  "gem.gov.in",
  "mca.gov.in",
  "dpiit.gov.in",
  "makeinindia.com",
  "startupindia.gov.in",
  "ibef.org",
  "pib.gov.in",

  // ── VC & PE ecosystem ─────────────────────────────────────────────────────
  "pevcinsights.com",
  "theKenco.com",
  "blume.vc",
  "accel.com",
  "sequoiacap.com",
  "chiratae.com",
  "100x.vc",
  "indiaquodient.com",
  "kalaari.com",
  "nexusvp.com",
  "elevationcapital.com",
  "kedaara.com",
  "truenorth.co.in",
  "chryscapital.com",
  
]

// ─────────────────────────────────────────────────────────────────────────────
// EXCLUDED DOMAINS
// Domains that produce noise — job boards, generic advice blogs,
// consulting firm thought leadership, social Q&A.
// ─────────────────────────────────────────────────────────────────────────────

export const EXCLUDED_SIGNAL_DOMAINS: string[] = [
  // Job boards
  "naukri.com",
  "timesjobs.com",
  "shine.com",
  "indeed.com",
  "glassdoor.com",
  "ambitionbox.com",
  "foundit.in",
  "monster.com",
  "iimjobs.com",
  "hirist.com",
  "instahyre.com",

  // Consulting firm blogs (signal noise, not actual company signals)
  "mckinsey.com",
  "bcg.com",
  "bain.com",
  "deloitte.com",
  "pwc.com",
  "ey.com",
  "kpmg.com",
  "hbr.org",
  "accenture.com",

  // Generic Q&A, wiki, social
  "quora.com",
  "reddit.com",
  "wikipedia.org",
  "stackexchange.com",
  "stackoverflow.com",

  // Clickbait / low-quality aggregators
  "jagran.com",
  "aajtak.in",
  "zeenews.india.com",
  "timesnownews.com",
  "opindia.com",
  "thequint.com",
]

// ─────────────────────────────────────────────────────────────────────────────
// SIGNAL METADATA MAPS
// Used by UI (SignalFeed.tsx) and classifier output normalisation.
// ─────────────────────────────────────────────────────────────────────────────

/** Calibrated hiring-predictiveness score. Overrides Claude's output score. */
export const SIGNAL_STRENGTH_MAP: Record<SignalType, number> = {
  funding: 90,          // Capital raised → immediate headcount pressure
  contract_win: 85,     // Revenue secured → delivery team needed now
  leadership: 80,       // New leader = new team built around them
  geography: 75,        // New market = new local team
  product_launch: 70,   // Launch → growth, support, ops hires
  workstream: 65,       // M&A, new vertical → structural expansion
  headcount: 62,        // Explicit milestone post = growth phase confirmed
  job_posting_surge: 60,// Direct hiring intent — slightly less predictive than above
  regulatory: 55,       // Compliance mandate → specialist hires
  virality: 50,         // Ecosystem buzz → growth plans, not always immediate
}

export const SIGNAL_EMOJI_MAP: Record<SignalType, string> = {
  funding: "🚀",
  contract_win: "🤝",
  leadership: "👔",
  geography: "📍",
  product_launch: "🛠️",
  workstream: "🔀",
  headcount: "👥",
  job_posting_surge: "📈",
  virality: "🔥",
  regulatory: "⚖️",
}

export const SIGNAL_LABEL_MAP: Record<SignalType, string> = {
  funding: "Funding Round",
  contract_win: "Contract Win",
  leadership: "Leadership Hire",
  geography: "Geographic Expansion",
  product_launch: "Product Launch",
  workstream: "New Work Stream",
  headcount: "Headcount Growth",
  job_posting_surge: "Hiring Surge",
  virality: "Ecosystem Buzz",
  regulatory: "Regulatory Approval",
}

/** Tailwind background colour classes for signal badges in the UI */
export const SIGNAL_COLOR_MAP: Record<SignalType, string> = {
  funding: "bg-emerald-100 text-emerald-800",
  contract_win: "bg-blue-100 text-blue-800",
  leadership: "bg-violet-100 text-violet-800",
  geography: "bg-orange-100 text-orange-800",
  product_launch: "bg-cyan-100 text-cyan-800",
  workstream: "bg-indigo-100 text-indigo-800",
  headcount: "bg-teal-100 text-teal-800",
  job_posting_surge: "bg-rose-100 text-rose-800",
  virality: "bg-amber-100 text-amber-800",
  regulatory: "bg-slate-100 text-slate-800",
}

// ─────────────────────────────────────────────────────────────────────────────
// INDUSTRY-MODE SIGNAL SEARCH QUERIES
//
// Structure: Record<SignalType, string[]>
// Each string is an Exa neural search query targeting India-specific signals.
// These are used when the user has selected an industry (not a specific company).
// The Edge Function iterates over all 10 signal types × selected industries.
//
// Design principles:
//   - Queries are action-oriented ("raises", "wins", "opens") not descriptive
//   - Include recency language ("2025", "2026", "this year") for freshness
//   - Include India geography anchors to avoid US/global noise
//   - 12–15 queries per signal type to ensure comprehensive coverage
// ─────────────────────────────────────────────────────────────────────────────

export const SIGNAL_SEARCH_QUERIES: Record<SignalType, string[]> = {

  // ── FUNDING ───────────────────────────────────────────────────────────────
  // Strongest predictor. Covers all funding stages + India-specific language.
  funding: [
    "Indian startup raises funding 2025 2026",
    "series A funding India company",
    "series B funding India startup",
    "series C round India company",
    "series D funding India",
    "seed funding India startup 2026",
    "pre-series A India company raises",
    "growth equity investment India startup",
    "venture capital India company raises million",
    "raises crore India startup",
    "PE investment India company 2026",
    "strategic investment India startup",
    "bridge round India company funding",
    "debt funding India startup 2025",
    "NBFC raises funds India",
  ],

  // ── LEADERSHIP ────────────────────────────────────────────────────────────
  // New leaders build new teams. Every CXO hire is a hiring catalyst.
  leadership: [
    "appoints CEO India company 2026",
    "joins as CTO India startup",
    "named CFO India company",
    "new VP appointed India startup",
    "hires Chief India company",
    "onboards President India company",
    "appoints Managing Director India",
    "new COO India company hired",
    "joins as Head of India startup",
    "India company names new CMO",
    "appoints Chief Revenue Officer India",
    "leadership hire India startup 2026",
    "India company elevates to CEO",
    "joins board of directors India company",
    "India startup new founding team member",
  ],

  // ── GEOGRAPHY ─────────────────────────────────────────────────────────────
  // New market entry = immediate local team required.
  geography: [
    "India company opens new office city 2026",
    "startup expands to new city India",
    "company enters new market India",
    "India startup launches operations new state",
    "sets up headquarters India city",
    "company expands presence India 2026",
    "India startup opens regional office",
    "enters Tier 2 city India company",
    "company expands to South India",
    "India startup international expansion 2026",
    "opens Bengaluru office India company",
    "Mumbai office expansion India startup",
    "opens Delhi NCR India company 2026",
    "India company enters Southeast Asia",
    "India startup expansion plan new geography",
  ],

  // ── PRODUCT LAUNCH ────────────────────────────────────────────────────────
  // Every launch triggers growth, support, and ops hires within 30–60 days.
  product_launch: [
    "India startup launches new product 2026",
    "India company unveils new platform",
    "new app launched India startup",
    "product launch India company 2026",
    "India company releases new feature",
    "India startup goes live new service",
    "beta launch India startup 2026",
    "India company introduces new offering",
    "India startup announces new solution",
    "launches SaaS platform India",
    "India company launches mobile app",
    "India startup pilot program launch",
    "new B2B product launched India",
    "India company product v2 launch",
    "India fintech product launch 2026",
  ],

  // ── CONTRACT WIN ──────────────────────────────────────────────────────────
  // India-specific: GeM, ministry tenders, PSU deals are major hiring catalysts.
  contract_win: [
    "India company wins government contract 2026",
    "bags tender India company",
    "GeM portal order awarded India",
    "wins government project India",
    "defence contract awarded India company",
    "India company wins ministry project",
    "CPPP tender won India startup",
    "PSU contract India company wins",
    "India company signs large enterprise deal",
    "wins infrastructure project India",
    "India startup wins pilot with government",
    "NHAI contract awarded India company",
    "Railways project awarded India company",
    "Smart City project won India startup",
    "India company bags state government deal",
  ],

  // ── HEADCOUNT ─────────────────────────────────────────────────────────────
  // Milestone posts + explicit team growth announcements signal growth phase.
  headcount: [
    "India company crossed employees milestone 2026",
    "India startup hiring aggressively",
    "doubling team India company",
    "India startup plans to hire this year",
    "mass hiring drive India company",
    "India company expanding workforce",
    "100 hires India startup 2026",
    "we are growing the team India company",
    "India company crossed 500 employees",
    "India startup crossed 1000 employees",
    "India company plans hiring spree",
    "team expansion India startup 2026",
    "recruits 200 people India company",
    "India startup scaled team 2x",
    "India company growing headcount this quarter",
  ],

  // ── WORKSTREAM ────────────────────────────────────────────────────────────
  // M&A, pivots, new verticals all require new specialist teams.
  workstream: [
    "India company acquires startup 2026",
    "merger India company announced",
    "India startup launches new vertical",
    "strategic partnership India company signed",
    "joint venture India company formed",
    "India company new business unit",
    "India startup pivot announcement",
    "spin off India company 2026",
    "India company enters new segment",
    "acqui-hire India startup",
    "India company new subsidiary formed",
    "India company strategic investment portfolio company",
    "India startup announces demerger",
    "new division India company 2026",
    "India company restructures creates new arm",
  ],

  // ── REGULATORY ────────────────────────────────────────────────────────────
  // Licence grants force compliance hires. India has dense regulatory structure.
  regulatory: [
    "SEBI approval India company 2026",
    "RBI licence granted India fintech",
    "DPIIT recognition startup India",
    "FSSAI approval India food company",
    "IRDAI licence India insurance company",
    "MCA approval India company",
    "drug licence approved India pharma",
    "CDSCO clearance India",
    "India company receives regulatory approval",
    "compliant with new regulation India company",
    "data protection compliance India company",
    "India startup receives NBFC licence",
    "telecom licence India company",
    "India company receives ISO certification",
    "BIS certification India company 2026",
  ],

  // ── VIRALITY ──────────────────────────────────────────────────────────────
  // Ecosystem buzz = investor attention = growth pressure = hiring.
  virality: [
    "YC backed India startup 2026",
    "Y Combinator India founder batch",
    "Shark Tank India company deal",
    "India startup unicorn 2026",
    "India startup soonicorn",
    "India startup goes viral",
    "India company featured Forbes 30 Under 30",
    "India startup wins award 2026",
    "India company Nasscom product conclave",
    "India startup featured TechCrunch",
    "India company ET Startup Awards",
    "India startup chosen Google Accelerator",
    "India startup Microsoft accelerator selected",
    "India startup YC demo day 2026",
    "India company trending LinkedIn founder post",
  ],

  // ── JOB POSTING SURGE ─────────────────────────────────────────────────────
  // Direct signal — less predictive than funding but highly actionable.
  job_posting_surge: [
    "India company multiple open positions 2026",
    "we are hiring India startup LinkedIn",
    "India company urgent hiring drive",
    "open roles India company careers page",
    "India startup actively hiring team",
    "India company campus hiring drive",
    "lateral hiring India company 2026",
    "India startup hiring freshers experienced",
    "India company bulk hiring announcement",
    "India company referral bonus hiring",
    "India startup joining bonus hiring",
    "India company careers page new openings",
    "India company hiring across departments",
    "India startup no experience required hiring",
    "India company internship hiring batch 2026",
  ],
}

// ─────────────────────────────────────────────────────────────────────────────
// INDUSTRY-SPECIFIC SIGNAL QUERY OVERLAYS
//
// When a user selects an industry, the Edge Function combines the generic
// SIGNAL_SEARCH_QUERIES above WITH these industry-specific overlays.
// This produces hyper-targeted results for each industry's signal landscape.
//
// Structure: Record<IndustryName, Partial<Record<SignalType, string[]>>>
// ─────────────────────────────────────────────────────────────────────────────

export const INDUSTRY_SIGNAL_OVERLAYS: Record<string, Partial<Record<SignalType, string[]>>> = {

  Consulting: {
    funding: [
      "India consulting firm wins advisory mandate",
      "consulting firm expands India practice",
      "Big 4 India hiring mandate 2026",
      "boutique consulting firm India raises funding",
    ],
    leadership: [
      "Big 4 India appoints new partner",
      "consulting firm India promotes to principal",
      "new sector head consulting India",
    ],
    headcount: [
      "Big 4 India campus hiring 2026",
      "consulting firm India batch hiring",
      "McKinsey BCG Bain India intake",
      "management consulting India lateral hiring",
    ],
  },

  Technology: {
    funding: [
      "India SaaS startup raises series A",
      "India B2B startup funding 2026",
      "India deeptech startup raises funding",
      "India AI startup funding round",
    ],
    product_launch: [
      "India SaaS company new product launch",
      "India startup AI product launch 2026",
      "India tech company platform launch",
      "India startup developer tool launch",
    ],
    headcount: [
      "India tech company hiring engineers 2026",
      "India startup SDE hiring drive",
      "India tech company engineering team expansion",
      "India unicorn technology hiring",
    ],
  },

  Finance: {
    funding: [
      "India fintech company raises funding",
      "India wealth management firm funding 2026",
      "India AMC new fund raises capital",
    ],
    regulatory: [
      "SEBI new regulation India finance company",
      "RBI circular India company compliance",
      "India finance company AMFI registration",
      "new SEBI framework India asset manager",
    ],
    leadership: [
      "India finance company CFO appointed",
      "India bank new MD appointed",
      "India fintech hires new leadership",
    ],
  },

  Marketing: {
    funding: [
      "India D2C brand raises funding 2026",
      "India marketing agency funding",
      "India consumer brand investment round",
    ],
    product_launch: [
      "India brand launches new campaign",
      "India D2C brand new product line",
      "India company launches brand extension",
    ],
    headcount: [
      "India marketing company hiring growth team",
      "India brand manager hiring 2026",
      "India agency hiring creative talent",
    ],
  },

  "Investment Banking": {
    workstream: [
      "India IPO 2026 company listing",
      "India company files DRHP SEBI",
      "India QIP fundraise company",
      "India company rights issue 2026",
      "India company block deal",
      "India M&A deal signed 2026",
    ],
    leadership: [
      "India investment bank hires MD",
      "India IB appoints sector head",
      "bulge bracket India hire 2026",
    ],
    headcount: [
      "India investment bank analyst intake",
      "India IB summer analyst program",
      "India bank lateral hire deal team",
    ],
  },

  "Private Equity & VC": {
    funding: [
      "India PE fund closes new fund 2026",
      "India VC fund raises capital",
      "India growth equity fund new close",
      "India PE fund portfolio company exit",
    ],
    workstream: [
      "India PE buyout announced 2026",
      "India VC portfolio company acquisition",
      "India fund new investment thesis",
    ],
    leadership: [
      "India VC firm hires new partner",
      "India PE fund new principal hire",
      "India fund expands investment team",
    ],
  },

  FMCG: {
    product_launch: [
      "India FMCG company new product launch",
      "India consumer goods brand extension",
      "India food brand new SKU launch",
      "India FMCG innovation launch",
    ],
    geography: [
      "India FMCG company expands rural distribution",
      "India consumer brand Tier 2 expansion",
      "India FMCG enters new state",
    ],
    headcount: [
      "India FMCG management trainee batch",
      "India consumer goods company campus hiring",
      "India FMCG lateral hiring sales marketing",
    ],
  },

  "Pharma & Healthcare": {
    regulatory: [
      "India pharma company USFDA approval",
      "India drug gets CDSCO approval",
      "India pharma ANDA approval",
      "India biotech clinical trial approval",
      "India hospital NABH accreditation",
    ],
    product_launch: [
      "India pharma company launches new drug",
      "India healthtech platform launch",
      "India hospital launches new specialty",
      "India medtech product launch 2026",
    ],
    geography: [
      "India hospital chain opens new facility",
      "India pharma company new manufacturing plant",
      "India healthtech expands new city",
    ],
  },

  "Energy & Infrastructure": {
    contract_win: [
      "India renewable energy project awarded",
      "India solar project tender win",
      "India wind energy project allocated",
      "India infrastructure project NIT awarded",
      "India EPC company wins order",
      "India power project letter of intent",
    ],
    geography: [
      "India energy company new project state",
      "India solar plant commissioned new location",
      "India infrastructure project new corridor",
    ],
    regulatory: [
      "India company receives power purchase agreement",
      "India energy company environmental clearance",
      "India project forest clearance received",
    ],
  },

  "Media & Entertainment": {
    product_launch: [
      "India OTT platform new show launch",
      "India media company digital product launch",
      "India streaming service original content",
      "India gaming company new game launch",
    ],
    funding: [
      "India media startup raises funding",
      "India content company investment 2026",
      "India OTT platform funding round",
    ],
    geography: [
      "India media company launches regional language content",
      "India OTT expands new market",
    ],
  },

  Legal: {
    workstream: [
      "India law firm merger 2026",
      "India law firm new practice area",
      "India legal firm strategic alliance",
      "India law firm opens new office",
    ],
    headcount: [
      "India law firm lateral hire 2026",
      "India law firm associate intake",
      "India company in-house legal hiring",
    ],
    leadership: [
      "India law firm new partner promoted",
      "India GC appointed company",
      "India legal head hired startup",
    ],
  },

  "Human Resources": {
    funding: [
      "India HR tech company funding 2026",
      "India HRtech startup raises series A",
      "India payroll company investment",
    ],
    product_launch: [
      "India HR software new feature launch",
      "India HRMS platform launch",
      "India HR tech company new product",
    ],
    headcount: [
      "India HR company hiring people team",
      "India company people operations expansion",
    ],
  },

  "Real Estate": {
    geography: [
      "India real estate company new project launch",
      "India developer launches new township",
      "India REIT acquires new property",
      "India commercial real estate company new location",
    ],
    funding: [
      "India real estate company raises funding",
      "India proptech startup investment 2026",
      "India REIT new capital raise",
    ],
    regulatory: [
      "India developer RERA approval new project",
      "India company receives occupancy certificate",
      "India real estate SEZ approval",
    ],
  },

  "Logistics & Supply Chain": {
    funding: [
      "India logistics startup raises funding 2026",
      "India supply chain company investment",
      "India last mile startup series A",
    ],
    geography: [
      "India logistics company new warehouse city",
      "India company opens fulfillment center",
      "India 3PL new distribution center",
    ],
    contract_win: [
      "India logistics company wins retail contract",
      "India 3PL bags e-commerce fulfillment",
      "India freight company government logistics deal",
    ],
  },

  "E-commerce & D2C": {
    funding: [
      "India D2C brand raises funding 2026",
      "India e-commerce startup investment",
      "India quick commerce startup funding",
    ],
    product_launch: [
      "India D2C brand new product category",
      "India brand launches new platform",
      "India quick commerce dark store new city",
    ],
    geography: [
      "India e-commerce company new city launch",
      "India D2C expands offline retail",
      "India quick commerce expands Tier 2",
    ],
  },

  Edtech: {
    funding: [
      "India edtech startup raises funding 2026",
      "India education company investment",
      "India skilling startup series A",
    ],
    product_launch: [
      "India edtech company new course launch",
      "India skilling platform new programme",
      "India edtech new B2B product",
    ],
    geography: [
      "India edtech company opens offline centre",
      "India coaching brand new city",
      "India edtech Bharat expansion",
    ],
  },

  "Banking & Financial Services": {
    regulatory: [
      "RBI grants new bank licence India",
      "India NBFC gets RBI approval",
      "India payment bank licence",
      "India company receives RBI small finance bank licence",
    ],
    product_launch: [
      "India bank launches new product",
      "India NBFC new loan product",
      "India fintech launches new financial product",
    ],
    geography: [
      "India bank opens new branches",
      "India NBFC expands new geography",
      "India financial company new state operations",
    ],
  },

  "Manufacturing & Automotive": {
    geography: [
      "India auto company new plant announced",
      "India manufacturer greenfield plant",
      "India EV company new facility",
      "India manufacturer PLI scheme new plant",
    ],
    contract_win: [
      "India auto component company bags OEM order",
      "India defence company bags contract",
      "India manufacturer government order 2026",
      "India company wins export order",
    ],
    regulatory: [
      "India company PLI scheme approval",
      "India manufacturer EV subsidy approved",
      "India factory BIS certification",
    ],
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// WATCHLIST MODE — COMPANY-SPECIFIC SIGNAL QUERIES
//
// When a user adds a company to their watchlist, the Edge Function builds
// queries by injecting the company name into these templates.
// The classifier then confirms the company name matches.
//
// Usage in Edge Function:
//   WATCHLIST_QUERY_TEMPLATES[signalType].map(template =>
//     template.replace("{{COMPANY}}", companyName)
//   )
// ─────────────────────────────────────────────────────────────────────────────

export const WATCHLIST_QUERY_TEMPLATES: Record<SignalType, string[]> = {

  funding: [
    "{{COMPANY}} raises funding",
    "{{COMPANY}} funding round",
    "{{COMPANY}} investment raised",
    "{{COMPANY}} series A B C funding",
    "{{COMPANY}} venture capital",
  ],

  leadership: [
    "{{COMPANY}} new CEO appointed",
    "{{COMPANY}} hires new leadership",
    "{{COMPANY}} appoints CXO",
    "{{COMPANY}} new VP director hire",
    "{{COMPANY}} leadership change",
  ],

  geography: [
    "{{COMPANY}} new office city",
    "{{COMPANY}} expands new location",
    "{{COMPANY}} enters new market",
    "{{COMPANY}} new geography expansion",
  ],

  product_launch: [
    "{{COMPANY}} launches new product",
    "{{COMPANY}} new platform release",
    "{{COMPANY}} product announcement",
    "{{COMPANY}} new feature launch",
    "{{COMPANY}} new service launch",
  ],

  contract_win: [
    "{{COMPANY}} wins contract",
    "{{COMPANY}} bags order",
    "{{COMPANY}} wins tender",
    "{{COMPANY}} government deal",
    "{{COMPANY}} enterprise deal signed",
  ],

  headcount: [
    "{{COMPANY}} hiring 2026",
    "{{COMPANY}} expanding team",
    "{{COMPANY}} recruiting drive",
    "{{COMPANY}} headcount growth",
    "{{COMPANY}} we are hiring",
  ],

  workstream: [
    "{{COMPANY}} acquires company",
    "{{COMPANY}} merger acquisition",
    "{{COMPANY}} new business vertical",
    "{{COMPANY}} strategic partnership",
    "{{COMPANY}} joint venture",
  ],

  regulatory: [
    "{{COMPANY}} regulatory approval",
    "{{COMPANY}} licence granted",
    "{{COMPANY}} SEBI RBI approval",
    "{{COMPANY}} compliance certification",
  ],

  virality: [
    "{{COMPANY}} YC accelerator",
    "{{COMPANY}} Shark Tank",
    "{{COMPANY}} unicorn valuation",
    "{{COMPANY}} trending news",
    "{{COMPANY}} award recognition 2026",
  ],

  job_posting_surge: [
    "{{COMPANY}} open positions",
    "{{COMPANY}} careers jobs available",
    "{{COMPANY}} hiring multiple roles",
    "{{COMPANY}} job openings 2026",
  ],
}

// ─────────────────────────────────────────────────────────────────────────────
// WATCHLIST OUTREACH INTENT MAP
//
// Maps each signal type to an outreach angle for cold email/LinkedIn messages.
// Used by Outreach Intelligence to pre-populate the "reason for reaching out" field.
// ─────────────────────────────────────────────────────────────────────────────

export const WATCHLIST_OUTREACH_ANGLE: Record<SignalType, string> = {
  funding:
    "Congratulate them on the funding round and express interest in joining during this growth phase.",
  contract_win:
    "Reference the contract win and position yourself as someone who can help with the delivery team they'll need to build.",
  leadership:
    "Welcome the new leader and express interest in being part of the team they're building.",
  geography:
    "Reference their expansion into the new city/market and pitch yourself as someone who knows that market.",
  product_launch:
    "Congratulate on the launch and position yourself as someone who can help scale what they've built.",
  workstream:
    "Reference the strategic move (acquisition/partnership/new vertical) and pitch your relevant experience.",
  headcount:
    "Reference their growth milestone and express that you'd love to be part of the next phase.",
  job_posting_surge:
    "Reference that you noticed they're actively hiring and express interest in open or future roles.",
  regulatory:
    "Reference the approval/licence and note that this is a significant compliance milestone — pitch relevant skills.",
  virality:
    "Reference the recognition (YC, Shark Tank, award) and express interest in joining a company on an exciting trajectory.",
}

// ─────────────────────────────────────────────────────────────────────────────
// SIGNAL FRESHNESS WINDOWS
//
// How old (in days) a signal can be before it is considered stale for outreach.
// After this window, the signal is still stored but flagged as low-urgency.
// ─────────────────────────────────────────────────────────────────────────────

export const SIGNAL_FRESHNESS_DAYS: Record<SignalType, number> = {
  funding: 30,          // Strike while the hiring is hot
  contract_win: 21,     // Delivery teams get built fast
  leadership: 45,       // New leaders take 30–60 days to assess team
  geography: 30,        // Local hiring starts immediately
  product_launch: 21,   // Post-launch hiring is immediate
  workstream: 45,       // M&A integration hiring takes time
  headcount: 14,        // Headcount posts are the most time-sensitive
  job_posting_surge: 7, // Open roles — reach out within the week
  regulatory: 60,       // Compliance hires have longer lead time
  virality: 21,         // Buzz fades quickly; outreach timing matters
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY — build a watchlist query for a given company + signal type
// ─────────────────────────────────────────────────────────────────────────────

export function buildWatchlistQueries(
  companyName: string,
  signalType: SignalType
): string[] {
  return WATCHLIST_QUERY_TEMPLATES[signalType].map((template) =>
    template.replace(/\{\{COMPANY\}\}/g, companyName)
  )
}

/**
 * Returns merged queries for a given industry + signal type.
 * Combines generic queries with industry-specific overlays.
 */
export function buildIndustrySignalQueries(
  industry: string,
  signalType: SignalType
): string[] {
  const generic = SIGNAL_SEARCH_QUERIES[signalType] ?? []
  const overlay = INDUSTRY_SIGNAL_OVERLAYS[industry]?.[signalType] ?? []
  return [...generic, ...overlay]
}
