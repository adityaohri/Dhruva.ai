/**
 * INDIA CAREER INTELLIGENCE — COMPREHENSIVE TIER REGISTRY
 * =========================================================
 * Single source of truth for company & institution tier classification.
 * Used by analyst.ts for pedigree scoring, enrichWithTierData(), and
 * confidence scoring in the warm outreach feature.
 *
 * TIERS:
 *   Tier1 — Elite. Globally recognised brand, highest selectivity,
 *            strongest alumni network & exit opportunities.
 *   Tier2 — Strong. Well-regarded, good brand, competitive but below Tier 1.
 *   Tier3 — Standard. Legitimate employer, lower brand recognition.
 *
 * HOW TO USE:
 *   import { TIER_REGISTRY, classifyCompany, classifyInstitution } from "@/lib/tierRegistry";
 *
 * Last updated: March 2026
 */

export type Tier = "Tier1" | "Tier2" | "Tier3";
export type IndustryCategory =
  | "Consulting"
  | "InvestmentBanking"
  | "PE_VC"
  | "TechGlobal"
  | "TechIndia"
  | "BankingFinance"
  | "FMCG"
  | "PharmaHealth"
  | "EnergyInfra"
  | "ManufacturingAuto"
  | "MediaTelecom"
  | "RealEstate"
  | "Conglomerates";

export interface CompanyEntry {
  name: string;
  indiaPresence: "Yes" | "No";
  tier: Tier;
  notes: string;
  aliases: string[];
}

export interface InstitutionEntry {
  name: string;
  region: "India" | "Global";
  tier: Tier;
  notes: string;
  aliases: string[];
}

// ─────────────────────────────────────────────────────────────
// COMPANIES
// ─────────────────────────────────────────────────────────────

export const CONSULTING: CompanyEntry[] = [
  { name: "McKinsey & Company", indiaPresence: "Yes", tier: "Tier1", notes: "MBB – global strategy leader", aliases: ["McKinsey"] },
  { name: "Boston Consulting Group", indiaPresence: "Yes", tier: "Tier1", notes: "MBB – global strategy leader", aliases: ["BCG"] },
  { name: "Bain & Company", indiaPresence: "Yes", tier: "Tier1", notes: "MBB – global strategy leader", aliases: ["Bain"] },
  { name: "Oliver Wyman", indiaPresence: "Yes", tier: "Tier1", notes: "Financial services-focused strategy", aliases: [] },
  { name: "Roland Berger", indiaPresence: "Yes", tier: "Tier1", notes: "European strategy powerhouse", aliases: [] },
  { name: "Kearney", indiaPresence: "Yes", tier: "Tier1", notes: "Operations & strategy", aliases: ["A.T. Kearney"] },
  { name: "Monitor Deloitte", indiaPresence: "Yes", tier: "Tier1", notes: "Strategy arm of Deloitte", aliases: [] },
  { name: "Strategy& (PwC)", indiaPresence: "Yes", tier: "Tier1", notes: "Strategy arm of PwC", aliases: ["Strategy and"] },
  { name: "L.E.K. Consulting", indiaPresence: "No", tier: "Tier1", notes: "PE & life sciences focus", aliases: ["LEK"] },
  { name: "Arthur D. Little", indiaPresence: "No", tier: "Tier1", notes: "Innovation & technology strategy", aliases: ["ADL"] },
  { name: "Deloitte Consulting", indiaPresence: "Yes", tier: "Tier2", notes: "Big 4 – consulting arm", aliases: ["Deloitte"] },
  { name: "EY-Parthenon", indiaPresence: "Yes", tier: "Tier2", notes: "Strategy arm of EY", aliases: ["EY Parthenon"] },
  { name: "PwC Consulting", indiaPresence: "Yes", tier: "Tier2", notes: "Big 4 consulting", aliases: ["PwC"] },
  { name: "KPMG Advisory", indiaPresence: "Yes", tier: "Tier2", notes: "Big 4 advisory", aliases: ["KPMG"] },
  { name: "Grant Thornton", indiaPresence: "Yes", tier: "Tier2", notes: "Mid-market advisory", aliases: [] },
  { name: "Alvarez & Marsal", indiaPresence: "Yes", tier: "Tier2", notes: "Turnaround & restructuring", aliases: ["A&M"] },
  { name: "FTI Consulting", indiaPresence: "Yes", tier: "Tier2", notes: "Litigation & economic consulting", aliases: ["FTI"] },
  { name: "Accenture Strategy", indiaPresence: "Yes", tier: "Tier2", notes: "Strategy practice of Accenture", aliases: [] },
  { name: "ZS Associates", indiaPresence: "Yes", tier: "Tier2", notes: "Pharma & life sciences focus", aliases: ["ZS"] },
  { name: "Analysys Mason", indiaPresence: "No", tier: "Tier2", notes: "Telecom & media strategy", aliases: [] },
  { name: "Accenture", indiaPresence: "Yes", tier: "Tier3", notes: "IT & BPO consulting", aliases: [] },
  { name: "Capgemini Consulting", indiaPresence: "Yes", tier: "Tier3", notes: "IT consulting", aliases: ["Capgemini"] },
  { name: "Infosys Consulting", indiaPresence: "Yes", tier: "Tier3", notes: "IT consulting arm of Infosys", aliases: [] },
  { name: "Wipro Consulting", indiaPresence: "Yes", tier: "Tier3", notes: "IT consulting arm of Wipro", aliases: [] },
  { name: "Cognizant Consulting", indiaPresence: "Yes", tier: "Tier3", notes: "IT consulting arm of Cognizant", aliases: [] },
  { name: "Mphasis", indiaPresence: "Yes", tier: "Tier3", notes: "IT services", aliases: [] },
  { name: "Hexaware", indiaPresence: "Yes", tier: "Tier3", notes: "IT & BPO services", aliases: [] },
];

export const INVESTMENT_BANKING: CompanyEntry[] = [
  { name: "Goldman Sachs", indiaPresence: "Yes", tier: "Tier1", notes: "Bulge bracket – global IB leader", aliases: ["GS"] },
  { name: "Morgan Stanley", indiaPresence: "Yes", tier: "Tier1", notes: "Bulge bracket", aliases: ["MS"] },
  { name: "JP Morgan", indiaPresence: "Yes", tier: "Tier1", notes: "Bulge bracket", aliases: ["JPM", "Chase"] },
  { name: "Bank of America Merrill Lynch", indiaPresence: "Yes", tier: "Tier1", notes: "Bulge bracket", aliases: ["BAML", "BofA"] },
  { name: "Citibank", indiaPresence: "Yes", tier: "Tier1", notes: "Bulge bracket", aliases: ["Citi", "Citigroup"] },
  { name: "Barclays", indiaPresence: "Yes", tier: "Tier1", notes: "Bulge bracket", aliases: [] },
  { name: "Deutsche Bank", indiaPresence: "Yes", tier: "Tier1", notes: "Bulge bracket", aliases: ["DB"] },
  { name: "UBS", indiaPresence: "Yes", tier: "Tier1", notes: "Bulge bracket", aliases: [] },
  { name: "HSBC", indiaPresence: "Yes", tier: "Tier1", notes: "Global universal bank", aliases: [] },
  { name: "Lazard", indiaPresence: "No", tier: "Tier1", notes: "Elite boutique – M&A & restructuring", aliases: [] },
  { name: "Evercore", indiaPresence: "No", tier: "Tier1", notes: "Elite boutique", aliases: [] },
  { name: "Centerview Partners", indiaPresence: "No", tier: "Tier1", notes: "Elite boutique – M&A focus", aliases: [] },
  { name: "Rothschild & Co", indiaPresence: "Yes", tier: "Tier1", notes: "Elite boutique – M&A advisory", aliases: ["Rothschild"] },
  { name: "Houlihan Lokey", indiaPresence: "No", tier: "Tier1", notes: "Restructuring & M&A", aliases: ["HL"] },
  { name: "Jefferies", indiaPresence: "No", tier: "Tier2", notes: "Mid-market IB", aliases: [] },
  { name: "Kotak Investment Banking", indiaPresence: "Yes", tier: "Tier2", notes: "India top domestic IB", aliases: ["Kotak IB"] },
  { name: "JM Financial", indiaPresence: "Yes", tier: "Tier2", notes: "India domestic IB", aliases: [] },
  { name: "Avendus Capital", indiaPresence: "Yes", tier: "Tier2", notes: "India M&A & PE advisory", aliases: ["Avendus"] },
  { name: "ICICI Securities", indiaPresence: "Yes", tier: "Tier2", notes: "India IB & brokerage", aliases: ["I-Sec"] },
  { name: "Axis Capital", indiaPresence: "Yes", tier: "Tier2", notes: "India domestic IB", aliases: [] },
  { name: "IIFL Securities", indiaPresence: "Yes", tier: "Tier2", notes: "India brokerage & IB", aliases: ["IIFL"] },
  { name: "SBI Capital Markets", indiaPresence: "Yes", tier: "Tier2", notes: "PSU IB", aliases: ["SBI Caps"] },
  { name: "Edelweiss", indiaPresence: "Yes", tier: "Tier2", notes: "India financial services & IB", aliases: [] },
  { name: "BOB Capital Markets", indiaPresence: "Yes", tier: "Tier3", notes: "PSU IB", aliases: ["BOBCAPS"] },
  { name: "Emkay Global", indiaPresence: "Yes", tier: "Tier3", notes: "India mid-market brokerage", aliases: [] },
  { name: "Nuvama", indiaPresence: "Yes", tier: "Tier3", notes: "India wealth & IB", aliases: ["Edelweiss Wealth"] },
];

export const PE_VC: CompanyEntry[] = [
  { name: "Blackstone", indiaPresence: "Yes", tier: "Tier1", notes: "Global PE – largest AUM", aliases: [] },
  { name: "KKR", indiaPresence: "Yes", tier: "Tier1", notes: "Global PE", aliases: [] },
  { name: "Carlyle Group", indiaPresence: "Yes", tier: "Tier1", notes: "Global PE", aliases: [] },
  { name: "Apollo Global Management", indiaPresence: "Yes", tier: "Tier1", notes: "Global PE & credit", aliases: ["Apollo"] },
  { name: "Warburg Pincus", indiaPresence: "Yes", tier: "Tier1", notes: "Global PE – large India presence", aliases: ["WP"] },
  { name: "General Atlantic", indiaPresence: "Yes", tier: "Tier1", notes: "Global growth equity", aliases: ["GA"] },
  { name: "Advent International", indiaPresence: "Yes", tier: "Tier1", notes: "Global PE", aliases: ["Advent"] },
  { name: "Bain Capital", indiaPresence: "Yes", tier: "Tier1", notes: "Global PE", aliases: [] },
  { name: "TPG Capital", indiaPresence: "Yes", tier: "Tier1", notes: "Global PE", aliases: ["TPG"] },
  { name: "CVC Capital Partners", indiaPresence: "No", tier: "Tier1", notes: "European PE", aliases: ["CVC"] },
  { name: "Sequoia Capital India", indiaPresence: "Yes", tier: "Tier1", notes: "Top VC – India/SE Asia", aliases: ["Peak XV", "Sequoia"] },
  { name: "Accel India", indiaPresence: "Yes", tier: "Tier1", notes: "Top VC – India focus", aliases: ["Accel"] },
  { name: "Tiger Global", indiaPresence: "Yes", tier: "Tier1", notes: "Global hedge fund + growth VC", aliases: [] },
  { name: "SoftBank Vision Fund", indiaPresence: "Yes", tier: "Tier1", notes: "Mega-fund – late stage", aliases: ["SoftBank"] },
  { name: "Temasek", indiaPresence: "Yes", tier: "Tier1", notes: "Singapore sovereign fund", aliases: [] },
  { name: "GIC", indiaPresence: "Yes", tier: "Tier1", notes: "Singapore sovereign fund", aliases: [] },
  { name: "Matrix Partners India", indiaPresence: "Yes", tier: "Tier1", notes: "India VC – early stage", aliases: ["Matrix"] },
  { name: "Nexus Venture Partners", indiaPresence: "Yes", tier: "Tier1", notes: "India VC – early/mid stage", aliases: ["Nexus"] },
  { name: "Blume Ventures", indiaPresence: "Yes", tier: "Tier2", notes: "India VC – seed/early stage", aliases: ["Blume"] },
  { name: "Kalaari Capital", indiaPresence: "Yes", tier: "Tier2", notes: "India VC", aliases: ["Kalaari"] },
  { name: "SAIF Partners", indiaPresence: "Yes", tier: "Tier2", notes: "India growth equity", aliases: ["Elevation Capital"] },
  { name: "Lightspeed India", indiaPresence: "Yes", tier: "Tier2", notes: "India VC arm of Lightspeed", aliases: ["Lightspeed"] },
  { name: "Stellaris Venture Partners", indiaPresence: "Yes", tier: "Tier2", notes: "India early-stage VC", aliases: ["Stellaris"] },
  { name: "3one4 Capital", indiaPresence: "Yes", tier: "Tier2", notes: "India VC", aliases: [] },
  { name: "India Quotient", indiaPresence: "Yes", tier: "Tier2", notes: "India early-stage VC", aliases: ["IQ"] },
  { name: "100X.VC", indiaPresence: "Yes", tier: "Tier2", notes: "India pre-seed VC", aliases: [] },
  { name: "Kedaara Capital", indiaPresence: "Yes", tier: "Tier2", notes: "India mid-market PE", aliases: ["Kedaara"] },
  { name: "True North", indiaPresence: "Yes", tier: "Tier2", notes: "India PE", aliases: ["India Value Fund"] },
  { name: "ChrysCapital", indiaPresence: "Yes", tier: "Tier2", notes: "India PE – established player", aliases: [] },
  { name: "Motilal Oswal PE", indiaPresence: "Yes", tier: "Tier3", notes: "India mid-market PE", aliases: ["MOPE"] },
  { name: "IDFC Alternatives", indiaPresence: "Yes", tier: "Tier3", notes: "India infra/PE", aliases: [] },
];

export const TECH_GLOBAL: CompanyEntry[] = [
  { name: "Google", indiaPresence: "Yes", tier: "Tier1", notes: "FAANG – search, cloud, AI", aliases: ["Alphabet", "Google LLC"] },
  { name: "Microsoft", indiaPresence: "Yes", tier: "Tier1", notes: "FAANG – cloud, enterprise, AI", aliases: ["MSFT"] },
  { name: "Meta", indiaPresence: "Yes", tier: "Tier1", notes: "FAANG – social media", aliases: ["Facebook", "Instagram", "WhatsApp"] },
  { name: "Amazon", indiaPresence: "Yes", tier: "Tier1", notes: "FAANG – e-commerce, cloud", aliases: ["AWS", "AMZN"] },
  { name: "Apple", indiaPresence: "Yes", tier: "Tier1", notes: "FAANG – consumer devices & services", aliases: ["AAPL"] },
  { name: "Netflix", indiaPresence: "Yes", tier: "Tier1", notes: "Streaming leader", aliases: ["NFLX"] },
  { name: "Salesforce", indiaPresence: "Yes", tier: "Tier1", notes: "CRM & SaaS leader", aliases: ["SFDC"] },
  { name: "Adobe", indiaPresence: "Yes", tier: "Tier1", notes: "Creative & marketing SaaS", aliases: [] },
  { name: "Uber", indiaPresence: "Yes", tier: "Tier1", notes: "Mobility & delivery platform", aliases: [] },
  { name: "Airbnb", indiaPresence: "No", tier: "Tier1", notes: "Travel marketplace", aliases: [] },
  { name: "Stripe", indiaPresence: "No", tier: "Tier1", notes: "Payments infrastructure", aliases: [] },
  { name: "OpenAI", indiaPresence: "No", tier: "Tier1", notes: "AI research & products", aliases: [] },
  { name: "Anthropic", indiaPresence: "No", tier: "Tier1", notes: "AI safety & research", aliases: [] },
  { name: "Nvidia", indiaPresence: "Yes", tier: "Tier1", notes: "GPU & AI chips", aliases: ["NVDA"] },
  { name: "Intel", indiaPresence: "Yes", tier: "Tier1", notes: "Semiconductor", aliases: [] },
  { name: "SAP", indiaPresence: "Yes", tier: "Tier1", notes: "Enterprise ERP", aliases: [] },
  { name: "Oracle", indiaPresence: "Yes", tier: "Tier1", notes: "Enterprise DB & cloud", aliases: [] },
  { name: "ServiceNow", indiaPresence: "Yes", tier: "Tier1", notes: "Enterprise workflow SaaS", aliases: ["NOW"] },
  { name: "Workday", indiaPresence: "Yes", tier: "Tier1", notes: "HR & finance SaaS", aliases: [] },
  { name: "LinkedIn", indiaPresence: "Yes", tier: "Tier1", notes: "Professional network (Microsoft)", aliases: [] },
  { name: "IBM", indiaPresence: "Yes", tier: "Tier2", notes: "Enterprise IT & consulting", aliases: [] },
  { name: "Cisco", indiaPresence: "Yes", tier: "Tier2", notes: "Networking & cybersecurity", aliases: [] },
  { name: "Snowflake", indiaPresence: "Yes", tier: "Tier2", notes: "Cloud data platform", aliases: [] },
  { name: "Databricks", indiaPresence: "Yes", tier: "Tier2", notes: "Data & AI platform", aliases: [] },
  { name: "Palantir", indiaPresence: "No", tier: "Tier2", notes: "Data analytics & gov tech", aliases: [] },
  { name: "Atlassian", indiaPresence: "Yes", tier: "Tier2", notes: "Dev tools – Jira, Confluence", aliases: [] },
  { name: "Zoom", indiaPresence: "Yes", tier: "Tier2", notes: "Video communications", aliases: [] },
  { name: "HubSpot", indiaPresence: "No", tier: "Tier2", notes: "Marketing & CRM SaaS", aliases: [] },
  { name: "Twilio", indiaPresence: "No", tier: "Tier2", notes: "Communications API platform", aliases: [] },
  { name: "VMware", indiaPresence: "Yes", tier: "Tier2", notes: "Virtualisation (Broadcom)", aliases: [] },
];

export const TECH_INDIA: CompanyEntry[] = [
  { name: "Tata Consultancy Services", indiaPresence: "Yes", tier: "Tier1", notes: "India's largest IT company", aliases: ["TCS"] },
  { name: "Infosys", indiaPresence: "Yes", tier: "Tier1", notes: "India IT leader", aliases: [] },
  { name: "Wipro", indiaPresence: "Yes", tier: "Tier1", notes: "India IT & consulting", aliases: [] },
  { name: "HCL Technologies", indiaPresence: "Yes", tier: "Tier1", notes: "India IT services", aliases: ["HCL Tech"] },
  { name: "Tech Mahindra", indiaPresence: "Yes", tier: "Tier1", notes: "IT services – telecom focus", aliases: [] },
  { name: "Flipkart", indiaPresence: "Yes", tier: "Tier1", notes: "India e-commerce leader (Walmart)", aliases: [] },
  { name: "Swiggy", indiaPresence: "Yes", tier: "Tier1", notes: "Food & quick commerce platform", aliases: [] },
  { name: "Zomato", indiaPresence: "Yes", tier: "Tier1", notes: "Food delivery & Blinkit", aliases: [] },
  { name: "Ola", indiaPresence: "Yes", tier: "Tier1", notes: "Mobility & EV", aliases: ["ANI Technologies", "Ola Electric"] },
  { name: "Paytm", indiaPresence: "Yes", tier: "Tier1", notes: "Fintech & payments", aliases: ["One97 Communications"] },
  { name: "CRED", indiaPresence: "Yes", tier: "Tier1", notes: "Fintech – credit card rewards", aliases: [] },
  { name: "PhonePe", indiaPresence: "Yes", tier: "Tier1", notes: "UPI payments leader", aliases: [] },
  { name: "Razorpay", indiaPresence: "Yes", tier: "Tier1", notes: "B2B payments infrastructure", aliases: [] },
  { name: "Zepto", indiaPresence: "Yes", tier: "Tier1", notes: "Quick commerce", aliases: [] },
  { name: "Groww", indiaPresence: "Yes", tier: "Tier1", notes: "Investment platform", aliases: [] },
  { name: "Zerodha", indiaPresence: "Yes", tier: "Tier1", notes: "Discount brokerage", aliases: [] },
  { name: "Dream11", indiaPresence: "Yes", tier: "Tier1", notes: "Fantasy sports", aliases: ["Dream Sports"] },
  { name: "Meesho", indiaPresence: "Yes", tier: "Tier1", notes: "Social commerce", aliases: [] },
  { name: "Nykaa", indiaPresence: "Yes", tier: "Tier1", notes: "Beauty & fashion e-commerce", aliases: ["FSN E-Commerce"] },
  { name: "Byju's", indiaPresence: "Yes", tier: "Tier1", notes: "Edtech – large unicorn", aliases: ["Think & Learn"] },
  { name: "MakeMyTrip", indiaPresence: "Yes", tier: "Tier2", notes: "Online travel aggregator", aliases: ["MMT"] },
  { name: "Freshworks", indiaPresence: "Yes", tier: "Tier2", notes: "SaaS – CRM & ITSM", aliases: [] },
  { name: "Zoho", indiaPresence: "Yes", tier: "Tier2", notes: "SaaS suite – India-founded", aliases: [] },
  { name: "upGrad", indiaPresence: "Yes", tier: "Tier2", notes: "Edtech – higher education", aliases: [] },
  { name: "Unacademy", indiaPresence: "Yes", tier: "Tier2", notes: "Edtech – competitive exams", aliases: [] },
  { name: "ShareChat", indiaPresence: "Yes", tier: "Tier2", notes: "Social media – vernacular", aliases: ["Moj"] },
  { name: "Urban Company", indiaPresence: "Yes", tier: "Tier2", notes: "Home services marketplace", aliases: ["UrbanClap"] },
  { name: "Lenskart", indiaPresence: "Yes", tier: "Tier2", notes: "D2C eyewear", aliases: [] },
  { name: "Moglix", indiaPresence: "Yes", tier: "Tier2", notes: "B2B industrial e-commerce", aliases: [] },
  { name: "Cars24", indiaPresence: "Yes", tier: "Tier2", notes: "Used car marketplace", aliases: [] },
  { name: "Delhivery", indiaPresence: "Yes", tier: "Tier2", notes: "Logistics & supply chain", aliases: [] },
  { name: "BrowserStack", indiaPresence: "Yes", tier: "Tier2", notes: "Dev testing platform", aliases: [] },
  { name: "Postman", indiaPresence: "Yes", tier: "Tier2", notes: "API development platform", aliases: [] },
  { name: "Chargebee", indiaPresence: "Yes", tier: "Tier2", notes: "Subscription billing SaaS", aliases: [] },
  { name: "Mphasis", indiaPresence: "Yes", tier: "Tier3", notes: "IT services", aliases: [] },
  { name: "Hexaware", indiaPresence: "Yes", tier: "Tier3", notes: "IT & BPO", aliases: [] },
  { name: "Persistent Systems", indiaPresence: "Yes", tier: "Tier3", notes: "IT services", aliases: [] },
  { name: "Coforge", indiaPresence: "Yes", tier: "Tier3", notes: "IT services", aliases: ["NIIT Technologies"] },
  { name: "Mastek", indiaPresence: "Yes", tier: "Tier3", notes: "IT services", aliases: [] },
];

export const BANKING_FINANCE: CompanyEntry[] = [
  { name: "HDFC Bank", indiaPresence: "Yes", tier: "Tier1", notes: "India's largest private bank", aliases: [] },
  { name: "ICICI Bank", indiaPresence: "Yes", tier: "Tier1", notes: "Top private bank", aliases: [] },
  { name: "Kotak Mahindra Bank", indiaPresence: "Yes", tier: "Tier1", notes: "Top private bank", aliases: ["Kotak"] },
  { name: "Axis Bank", indiaPresence: "Yes", tier: "Tier1", notes: "Top private bank", aliases: [] },
  { name: "State Bank of India", indiaPresence: "Yes", tier: "Tier1", notes: "India's largest PSU bank", aliases: ["SBI"] },
  { name: "Bajaj Finance", indiaPresence: "Yes", tier: "Tier1", notes: "India's top NBFC", aliases: ["Bajaj Finserv"] },
  { name: "HDFC AMC", indiaPresence: "Yes", tier: "Tier1", notes: "India's largest mutual fund", aliases: [] },
  { name: "SBI Mutual Fund", indiaPresence: "Yes", tier: "Tier1", notes: "Largest AUM in India", aliases: ["SBI MF"] },
  { name: "HDFC Life", indiaPresence: "Yes", tier: "Tier1", notes: "India top life insurer", aliases: [] },
  { name: "ICICI Prudential", indiaPresence: "Yes", tier: "Tier1", notes: "Life insurance", aliases: [] },
  { name: "SBI Life", indiaPresence: "Yes", tier: "Tier1", notes: "Life insurance – largest by premium", aliases: [] },
  { name: "LIC", indiaPresence: "Yes", tier: "Tier1", notes: "State-owned insurer – largest in India", aliases: ["Life Insurance Corporation"] },
  { name: "Bank of Baroda", indiaPresence: "Yes", tier: "Tier2", notes: "Top PSU bank", aliases: ["BOB"] },
  { name: "Punjab National Bank", indiaPresence: "Yes", tier: "Tier2", notes: "PSU bank", aliases: ["PNB"] },
  { name: "Canara Bank", indiaPresence: "Yes", tier: "Tier2", notes: "PSU bank", aliases: [] },
  { name: "IndusInd Bank", indiaPresence: "Yes", tier: "Tier2", notes: "Private bank", aliases: [] },
  { name: "Yes Bank", indiaPresence: "Yes", tier: "Tier2", notes: "Private bank – recovering", aliases: [] },
  { name: "Federal Bank", indiaPresence: "Yes", tier: "Tier2", notes: "Private bank – Kerala HQ", aliases: [] },
  { name: "IDFC First Bank", indiaPresence: "Yes", tier: "Tier2", notes: "Private bank", aliases: [] },
  { name: "ICICI Lombard", indiaPresence: "Yes", tier: "Tier2", notes: "General insurance", aliases: [] },
  { name: "Bajaj Allianz", indiaPresence: "Yes", tier: "Tier2", notes: "General insurance", aliases: [] },
  { name: "Muthoot Finance", indiaPresence: "Yes", tier: "Tier2", notes: "Gold NBFC", aliases: [] },
  { name: "Shriram Finance", indiaPresence: "Yes", tier: "Tier2", notes: "NBFC – vehicle financing", aliases: [] },
  { name: "Cholamandalam", indiaPresence: "Yes", tier: "Tier2", notes: "NBFC – vehicle & home loans", aliases: ["Chola"] },
  { name: "Nippon India Mutual Fund", indiaPresence: "Yes", tier: "Tier2", notes: "Asset management", aliases: [] },
  { name: "Mirae Asset", indiaPresence: "Yes", tier: "Tier2", notes: "Asset management", aliases: [] },
  { name: "RBL Bank", indiaPresence: "Yes", tier: "Tier3", notes: "Private bank – smaller", aliases: [] },
  { name: "Union Bank of India", indiaPresence: "Yes", tier: "Tier3", notes: "PSU bank", aliases: [] },
];

export const FMCG: CompanyEntry[] = [
  { name: "Hindustan Unilever", indiaPresence: "Yes", tier: "Tier1", notes: "India FMCG leader", aliases: ["HUL"] },
  { name: "ITC Limited", indiaPresence: "Yes", tier: "Tier1", notes: "Conglomerate – FMCG, hotels, agri", aliases: ["ITC"] },
  { name: "Nestle India", indiaPresence: "Yes", tier: "Tier1", notes: "FMCG – foods & beverages", aliases: ["Nestlé"] },
  { name: "Procter & Gamble India", indiaPresence: "Yes", tier: "Tier1", notes: "FMCG – global", aliases: ["P&G"] },
  { name: "Colgate-Palmolive India", indiaPresence: "Yes", tier: "Tier1", notes: "FMCG – oral care", aliases: ["Colgate"] },
  { name: "Dabur India", indiaPresence: "Yes", tier: "Tier1", notes: "FMCG – Ayurvedic", aliases: ["Dabur"] },
  { name: "Godrej Consumer Products", indiaPresence: "Yes", tier: "Tier1", notes: "FMCG – household", aliases: ["GCPL"] },
  { name: "Marico", indiaPresence: "Yes", tier: "Tier1", notes: "FMCG – hair & edible oils", aliases: [] },
  { name: "Britannia Industries", indiaPresence: "Yes", tier: "Tier1", notes: "FMCG – biscuits & bakery", aliases: [] },
  { name: "Tata Consumer Products", indiaPresence: "Yes", tier: "Tier1", notes: "FMCG – teas, foods", aliases: ["TCP"] },
  { name: "Reckitt India", indiaPresence: "Yes", tier: "Tier1", notes: "FMCG – health & hygiene", aliases: ["Reckitt Benckiser"] },
  { name: "Johnson & Johnson India", indiaPresence: "Yes", tier: "Tier1", notes: "FMCG & pharma", aliases: ["J&J"] },
  { name: "Amul", indiaPresence: "Yes", tier: "Tier1", notes: "Dairy cooperative", aliases: ["GCMMF"] },
  { name: "Emami", indiaPresence: "Yes", tier: "Tier2", notes: "FMCG – personal care", aliases: [] },
  { name: "Parle Products", indiaPresence: "Yes", tier: "Tier2", notes: "Biscuits & confectionery", aliases: [] },
  { name: "Patanjali", indiaPresence: "Yes", tier: "Tier2", notes: "FMCG – Ayurvedic", aliases: [] },
  { name: "Mother Dairy", indiaPresence: "Yes", tier: "Tier2", notes: "Dairy & foods", aliases: [] },
  { name: "Haldirams", indiaPresence: "Yes", tier: "Tier2", notes: "Snacks & sweets", aliases: [] },
];

export const PHARMA_HEALTH: CompanyEntry[] = [
  { name: "Sun Pharmaceutical", indiaPresence: "Yes", tier: "Tier1", notes: "India's largest pharma company", aliases: ["Sun Pharma"] },
  { name: "Dr. Reddy's Laboratories", indiaPresence: "Yes", tier: "Tier1", notes: "India pharma leader", aliases: ["DRL"] },
  { name: "Cipla", indiaPresence: "Yes", tier: "Tier1", notes: "India pharma – respiratory focus", aliases: [] },
  { name: "Lupin", indiaPresence: "Yes", tier: "Tier1", notes: "India pharma", aliases: [] },
  { name: "Aurobindo Pharma", indiaPresence: "Yes", tier: "Tier1", notes: "India generics exporter", aliases: [] },
  { name: "Biocon", indiaPresence: "Yes", tier: "Tier1", notes: "Biopharmaceuticals", aliases: [] },
  { name: "Divi's Laboratories", indiaPresence: "Yes", tier: "Tier1", notes: "API manufacturer", aliases: ["Divi's Labs"] },
  { name: "Pfizer India", indiaPresence: "Yes", tier: "Tier1", notes: "Global pharma – India arm", aliases: [] },
  { name: "Abbott India", indiaPresence: "Yes", tier: "Tier1", notes: "Global pharma – India arm", aliases: [] },
  { name: "AstraZeneca India", indiaPresence: "Yes", tier: "Tier1", notes: "Global pharma – India arm", aliases: [] },
  { name: "Apollo Hospitals", indiaPresence: "Yes", tier: "Tier1", notes: "India's largest hospital chain", aliases: [] },
  { name: "Fortis Healthcare", indiaPresence: "Yes", tier: "Tier1", notes: "Hospital chain", aliases: [] },
  { name: "Manipal Hospitals", indiaPresence: "Yes", tier: "Tier1", notes: "Hospital chain", aliases: [] },
  { name: "Narayana Health", indiaPresence: "Yes", tier: "Tier1", notes: "Cardiac care & hospital chain", aliases: ["NH"] },
  { name: "Max Healthcare", indiaPresence: "Yes", tier: "Tier1", notes: "Hospital chain – North India", aliases: [] },
  { name: "Torrent Pharmaceuticals", indiaPresence: "Yes", tier: "Tier2", notes: "India pharma", aliases: [] },
  { name: "Zydus Lifesciences", indiaPresence: "Yes", tier: "Tier2", notes: "India pharma", aliases: ["Cadila", "Zydus"] },
  { name: "Mankind Pharma", indiaPresence: "Yes", tier: "Tier2", notes: "India pharma – OTC leader", aliases: [] },
  { name: "Medanta", indiaPresence: "Yes", tier: "Tier2", notes: "Hospital – Gurugram", aliases: ["Global Health"] },
  { name: "Aster DM Healthcare", indiaPresence: "Yes", tier: "Tier2", notes: "Hospital chain – South India", aliases: ["Aster"] },
  { name: "1mg", indiaPresence: "Yes", tier: "Tier2", notes: "Health-tech & pharma", aliases: ["Tata 1mg"] },
  { name: "Practo", indiaPresence: "Yes", tier: "Tier2", notes: "Health-tech platform", aliases: [] },
  { name: "PharmEasy", indiaPresence: "Yes", tier: "Tier2", notes: "Health-tech & pharma", aliases: ["API Holdings"] },
];

export const ENERGY_INFRA: CompanyEntry[] = [
  { name: "Reliance Industries", indiaPresence: "Yes", tier: "Tier1", notes: "India's largest company – O&G, retail, telecom", aliases: ["RIL"] },
  { name: "ONGC", indiaPresence: "Yes", tier: "Tier1", notes: "PSU – India's largest oil company", aliases: ["Oil & Natural Gas Corp"] },
  { name: "Indian Oil Corporation", indiaPresence: "Yes", tier: "Tier1", notes: "PSU – downstream oil", aliases: ["IOC"] },
  { name: "Bharat Petroleum", indiaPresence: "Yes", tier: "Tier1", notes: "PSU – downstream oil", aliases: ["BPCL"] },
  { name: "Hindustan Petroleum", indiaPresence: "Yes", tier: "Tier1", notes: "PSU – downstream oil", aliases: ["HPCL"] },
  { name: "Adani Group", indiaPresence: "Yes", tier: "Tier1", notes: "Conglomerate – ports, energy, airports", aliases: ["Adani"] },
  { name: "Tata Power", indiaPresence: "Yes", tier: "Tier1", notes: "Power generation & distribution", aliases: [] },
  { name: "NTPC", indiaPresence: "Yes", tier: "Tier1", notes: "PSU – power generation", aliases: [] },
  { name: "Power Grid Corporation", indiaPresence: "Yes", tier: "Tier1", notes: "PSU – power transmission", aliases: ["PowerGrid"] },
  { name: "Larsen & Toubro", indiaPresence: "Yes", tier: "Tier1", notes: "Engineering & construction conglomerate", aliases: ["L&T"] },
  { name: "GAIL India", indiaPresence: "Yes", tier: "Tier1", notes: "PSU – natural gas", aliases: [] },
  { name: "Shell India", indiaPresence: "Yes", tier: "Tier1", notes: "Global O&G – India arm", aliases: [] },
  { name: "Schlumberger", indiaPresence: "Yes", tier: "Tier1", notes: "Oilfield services", aliases: ["SLB"] },
  { name: "Greenko", indiaPresence: "Yes", tier: "Tier2", notes: "Renewable energy", aliases: [] },
  { name: "ReNew Power", indiaPresence: "Yes", tier: "Tier2", notes: "Renewable energy", aliases: [] },
  { name: "JSW Energy", indiaPresence: "Yes", tier: "Tier2", notes: "Renewable & thermal power", aliases: [] },
  { name: "Torrent Power", indiaPresence: "Yes", tier: "Tier2", notes: "Private power distribution", aliases: [] },
  { name: "Petronet LNG", indiaPresence: "Yes", tier: "Tier2", notes: "LNG import & distribution", aliases: [] },
  { name: "BHEL", indiaPresence: "Yes", tier: "Tier2", notes: "PSU – power equipment", aliases: ["Bharat Heavy Electricals"] },
  { name: "Halliburton", indiaPresence: "Yes", tier: "Tier3", notes: "Oilfield services", aliases: [] },
];

export const MANUFACTURING_AUTO: CompanyEntry[] = [
  { name: "Tata Motors", indiaPresence: "Yes", tier: "Tier1", notes: "Auto – cars, CVs, JLR", aliases: [] },
  { name: "Mahindra & Mahindra", indiaPresence: "Yes", tier: "Tier1", notes: "Auto – SUVs, tractors, EVs", aliases: ["M&M"] },
  { name: "Maruti Suzuki", indiaPresence: "Yes", tier: "Tier1", notes: "India's largest carmaker", aliases: ["MSIL"] },
  { name: "Hyundai India", indiaPresence: "Yes", tier: "Tier1", notes: "Global OEM – India unit", aliases: [] },
  { name: "Toyota India", indiaPresence: "Yes", tier: "Tier1", notes: "Global OEM – India unit", aliases: [] },
  { name: "Hero MotoCorp", indiaPresence: "Yes", tier: "Tier1", notes: "India's largest 2-wheeler", aliases: ["Hero"] },
  { name: "Bajaj Auto", indiaPresence: "Yes", tier: "Tier1", notes: "2-3 wheeler – India & global", aliases: [] },
  { name: "TVS Motor Company", indiaPresence: "Yes", tier: "Tier1", notes: "2-wheeler – India", aliases: ["TVS"] },
  { name: "Royal Enfield", indiaPresence: "Yes", tier: "Tier1", notes: "Premium motorcycles", aliases: ["Eicher Motors"] },
  { name: "Bosch India", indiaPresence: "Yes", tier: "Tier1", notes: "Auto components – global", aliases: [] },
  { name: "Motherson Sumi", indiaPresence: "Yes", tier: "Tier1", notes: "Auto ancillary", aliases: ["Samvardhana Motherson"] },
  { name: "Bharat Forge", indiaPresence: "Yes", tier: "Tier1", notes: "Forgings – auto & defence", aliases: [] },
  { name: "Tata Steel", indiaPresence: "Yes", tier: "Tier1", notes: "Steel – India & global", aliases: [] },
  { name: "JSW Steel", indiaPresence: "Yes", tier: "Tier1", notes: "Steel – India's 2nd largest", aliases: [] },
  { name: "SAIL", indiaPresence: "Yes", tier: "Tier1", notes: "PSU steel", aliases: ["Steel Authority of India"] },
  { name: "Hindalco", indiaPresence: "Yes", tier: "Tier1", notes: "Aluminium – global", aliases: ["Novelis"] },
  { name: "Vedanta", indiaPresence: "Yes", tier: "Tier1", notes: "Mining & metals", aliases: [] },
  { name: "Ultratech Cement", indiaPresence: "Yes", tier: "Tier1", notes: "India's largest cement company", aliases: [] },
  { name: "Ola Electric", indiaPresence: "Yes", tier: "Tier1", notes: "EV – 2-wheelers", aliases: [] },
  { name: "Sundram Fasteners", indiaPresence: "Yes", tier: "Tier2", notes: "Auto components", aliases: [] },
  { name: "Minda Industries", indiaPresence: "Yes", tier: "Tier2", notes: "Auto components", aliases: [] },
  { name: "ACC Cement", indiaPresence: "Yes", tier: "Tier2", notes: "Cement", aliases: [] },
  { name: "Ambuja Cements", indiaPresence: "Yes", tier: "Tier2", notes: "Cement", aliases: [] },
  { name: "Shree Cement", indiaPresence: "Yes", tier: "Tier2", notes: "Cement", aliases: [] },
];

export const MEDIA_TELECOM: CompanyEntry[] = [
  { name: "Jio", indiaPresence: "Yes", tier: "Tier1", notes: "India's largest telecom", aliases: ["Reliance Jio"] },
  { name: "Airtel", indiaPresence: "Yes", tier: "Tier1", notes: "India telecom", aliases: ["Bharti Airtel"] },
  { name: "Star India", indiaPresence: "Yes", tier: "Tier1", notes: "OTT & broadcast", aliases: ["Disney+ Hotstar", "Disney Hotstar"] },
  { name: "Sony Pictures Networks India", indiaPresence: "Yes", tier: "Tier1", notes: "Broadcasting & OTT", aliases: ["SonyLIV"] },
  { name: "Netflix India", indiaPresence: "Yes", tier: "Tier1", notes: "OTT streaming", aliases: [] },
  { name: "Amazon Prime Video", indiaPresence: "Yes", tier: "Tier1", notes: "OTT streaming", aliases: [] },
  { name: "Zee Entertainment", indiaPresence: "Yes", tier: "Tier1", notes: "India broadcasting", aliases: ["ZEEL"] },
  { name: "Times Group", indiaPresence: "Yes", tier: "Tier1", notes: "Print & digital media", aliases: ["Bennett Coleman", "TOI"] },
  { name: "Vodafone Idea", indiaPresence: "Yes", tier: "Tier2", notes: "India telecom – distressed", aliases: ["Vi"] },
  { name: "Tata Communications", indiaPresence: "Yes", tier: "Tier2", notes: "Enterprise connectivity", aliases: [] },
  { name: "Hindustan Times Media", indiaPresence: "Yes", tier: "Tier2", notes: "Print & digital media", aliases: ["HT Media"] },
  { name: "Network18", indiaPresence: "Yes", tier: "Tier2", notes: "News & entertainment (Reliance)", aliases: [] },
  { name: "NDTV", indiaPresence: "Yes", tier: "Tier2", notes: "News – acquired by Adani", aliases: [] },
  { name: "The Hindu Group", indiaPresence: "Yes", tier: "Tier2", notes: "Print media", aliases: [] },
  { name: "Viacom18", indiaPresence: "Yes", tier: "Tier2", notes: "Entertainment – JioCinema", aliases: [] },
  { name: "BSNL", indiaPresence: "Yes", tier: "Tier3", notes: "PSU telecom", aliases: [] },
];

export const REAL_ESTATE: CompanyEntry[] = [
  { name: "DLF", indiaPresence: "Yes", tier: "Tier1", notes: "India's largest listed developer", aliases: [] },
  { name: "Godrej Properties", indiaPresence: "Yes", tier: "Tier1", notes: "Premium residential & commercial", aliases: ["GPL"] },
  { name: "Prestige Group", indiaPresence: "Yes", tier: "Tier1", notes: "South India developer", aliases: [] },
  { name: "Sobha", indiaPresence: "Yes", tier: "Tier1", notes: "Premium residential", aliases: [] },
  { name: "Lodha", indiaPresence: "Yes", tier: "Tier1", notes: "Mumbai developer", aliases: ["Macrotech"] },
  { name: "Oberoi Realty", indiaPresence: "Yes", tier: "Tier1", notes: "Mumbai premium developer", aliases: [] },
  { name: "Embassy REIT", indiaPresence: "Yes", tier: "Tier1", notes: "India's largest commercial REIT", aliases: ["Embassy Office Parks"] },
  { name: "JLL India", indiaPresence: "Yes", tier: "Tier1", notes: "Real estate services", aliases: ["Jones Lang LaSalle"] },
  { name: "CBRE India", indiaPresence: "Yes", tier: "Tier1", notes: "Real estate services", aliases: [] },
  { name: "Brigade Group", indiaPresence: "Yes", tier: "Tier2", notes: "South India developer", aliases: [] },
  { name: "Puravankara", indiaPresence: "Yes", tier: "Tier2", notes: "Residential developer", aliases: [] },
  { name: "Mindspace REIT", indiaPresence: "Yes", tier: "Tier2", notes: "Commercial REIT", aliases: [] },
  { name: "Nexus Select Trust", indiaPresence: "Yes", tier: "Tier2", notes: "Retail REIT", aliases: [] },
  { name: "Anarock", indiaPresence: "Yes", tier: "Tier2", notes: "India real estate advisory", aliases: [] },
  { name: "NoBroker", indiaPresence: "Yes", tier: "Tier2", notes: "Proptech platform", aliases: [] },
  { name: "MagicBricks", indiaPresence: "Yes", tier: "Tier2", notes: "Property portal", aliases: [] },
  { name: "99acres", indiaPresence: "Yes", tier: "Tier2", notes: "Property portal", aliases: [] },
  { name: "Housing.com", indiaPresence: "Yes", tier: "Tier3", notes: "Proptech platform", aliases: [] },
];

export const CONGLOMERATES: CompanyEntry[] = [
  { name: "Tata Group", indiaPresence: "Yes", tier: "Tier1", notes: "Largest India conglomerate – 30+ companies", aliases: ["Tata Sons"] },
  { name: "Reliance Industries", indiaPresence: "Yes", tier: "Tier1", notes: "O&G, retail, telecom, media", aliases: ["RIL"] },
  { name: "Adani Group", indiaPresence: "Yes", tier: "Tier1", notes: "Ports, airports, energy, media", aliases: [] },
  { name: "Mahindra Group", indiaPresence: "Yes", tier: "Tier1", notes: "Auto, IT, farm, financial services", aliases: ["M&M"] },
  { name: "Aditya Birla Group", indiaPresence: "Yes", tier: "Tier1", notes: "Cement, telecom, metals, fashion", aliases: ["ABG"] },
  { name: "Godrej Group", indiaPresence: "Yes", tier: "Tier1", notes: "FMCG, properties, agri", aliases: [] },
  { name: "Bajaj Group", indiaPresence: "Yes", tier: "Tier1", notes: "Auto, finance, insurance", aliases: [] },
  { name: "ITC Limited", indiaPresence: "Yes", tier: "Tier1", notes: "FMCG, hotels, agri, paperboards", aliases: ["ITC"] },
  { name: "Hinduja Group", indiaPresence: "Yes", tier: "Tier2", notes: "Trucks, bank, media", aliases: [] },
  { name: "Murugappa Group", indiaPresence: "Yes", tier: "Tier2", notes: "Diversified – South India", aliases: [] },
  { name: "TVS Group", indiaPresence: "Yes", tier: "Tier2", notes: "Auto, logistics, financial services", aliases: [] },
  { name: "Piramal Group", indiaPresence: "Yes", tier: "Tier2", notes: "Pharma, real estate, financial services", aliases: [] },
  { name: "RPG Group", indiaPresence: "Yes", tier: "Tier2", notes: "Power, infrastructure, retail", aliases: [] },
  { name: "Kirloskar Group", indiaPresence: "Yes", tier: "Tier2", notes: "Pumps, engines, valves", aliases: [] },
];

// ─────────────────────────────────────────────────────────────
// INSTITUTIONS
// ─────────────────────────────────────────────────────────────

export const INSTITUTIONS: InstitutionEntry[] = [
  { name: "IIM Ahmedabad", region: "India", tier: "Tier1", notes: "MBA – India #1", aliases: ["IIMA"] },
  { name: "IIM Bangalore", region: "India", tier: "Tier1", notes: "MBA – India #2", aliases: ["IIMB"] },
  { name: "IIM Calcutta", region: "India", tier: "Tier1", notes: "MBA – India #3", aliases: ["IIMC"] },
  { name: "IIM Lucknow", region: "India", tier: "Tier1", notes: "MBA – Top IIM", aliases: ["IIML"] },
  { name: "IIM Kozhikode", region: "India", tier: "Tier1", notes: "MBA – Top IIM", aliases: ["IIMK"] },
  { name: "IIM Indore", region: "India", tier: "Tier1", notes: "MBA – Top IIM", aliases: ["IIMI"] },
  { name: "IIM Udaipur", region: "India", tier: "Tier2", notes: "MBA – Newer IIM", aliases: ["IIMU"] },
  { name: "IIM Rohtak", region: "India", tier: "Tier2", notes: "MBA – Newer IIM", aliases: [] },
  { name: "IIM Trichy", region: "India", tier: "Tier2", notes: "MBA – Newer IIM", aliases: ["IIM Tiruchirappalli"] },
  { name: "IIM Ranchi", region: "India", tier: "Tier2", notes: "MBA – Newer IIM", aliases: [] },
  { name: "IIM Raipur", region: "India", tier: "Tier2", notes: "MBA – Newer IIM", aliases: [] },
  { name: "IIM Kashipur", region: "India", tier: "Tier2", notes: "MBA – Newer IIM", aliases: [] },
  { name: "IIM Nagpur", region: "India", tier: "Tier2", notes: "MBA – Newer IIM", aliases: [] },
  { name: "IIM Bodh Gaya", region: "India", tier: "Tier3", notes: "MBA – Baby IIM", aliases: [] },
  { name: "IIM Visakhapatnam", region: "India", tier: "Tier3", notes: "MBA – Baby IIM", aliases: ["IIM Vizag"] },
  { name: "IIM Sambalpur", region: "India", tier: "Tier3", notes: "MBA – Baby IIM", aliases: [] },
  { name: "IIM Amritsar", region: "India", tier: "Tier3", notes: "MBA – Baby IIM", aliases: [] },
  { name: "IIM Jammu", region: "India", tier: "Tier3", notes: "MBA – Baby IIM", aliases: [] },
  { name: "IIT Bombay", region: "India", tier: "Tier1", notes: "Engineering – India #1", aliases: ["IITB"] },
  { name: "IIT Delhi", region: "India", tier: "Tier1", notes: "Engineering – India top", aliases: ["IITD"] },
  { name: "IIT Madras", region: "India", tier: "Tier1", notes: "Engineering – India top", aliases: ["IITM"] },
  { name: "IIT Kharagpur", region: "India", tier: "Tier1", notes: "Engineering – India top", aliases: ["IITKgp"] },
  { name: "IIT Kanpur", region: "India", tier: "Tier1", notes: "Engineering – India top", aliases: ["IITK"] },
  { name: "IIT Roorkee", region: "India", tier: "Tier1", notes: "Engineering – India top", aliases: ["IITR"] },
  { name: "IIT Guwahati", region: "India", tier: "Tier1", notes: "Engineering – India top", aliases: ["IITG"] },
  { name: "IIT Hyderabad", region: "India", tier: "Tier2", notes: "Engineering", aliases: ["IITH"] },
  { name: "IIT Gandhinagar", region: "India", tier: "Tier2", notes: "Engineering", aliases: ["IITGN"] },
  { name: "IIT Patna", region: "India", tier: "Tier2", notes: "Engineering", aliases: ["IITP"] },
  { name: "IIT Jodhpur", region: "India", tier: "Tier2", notes: "Engineering", aliases: ["IITJ"] },
  { name: "IIT Mandi", region: "India", tier: "Tier2", notes: "Engineering", aliases: [] },
  { name: "IIT Tirupati", region: "India", tier: "Tier3", notes: "Engineering – Newer IIT", aliases: [] },
  { name: "IIT Palakkad", region: "India", tier: "Tier3", notes: "Engineering – Newer IIT", aliases: [] },
  { name: "IIT Dharwad", region: "India", tier: "Tier3", notes: "Engineering – Newer IIT", aliases: [] },
  { name: "ISB Hyderabad", region: "India", tier: "Tier1", notes: "MBA – leading B-school", aliases: ["Indian School of Business"] },
  { name: "XLRI Jamshedpur", region: "India", tier: "Tier1", notes: "MBA – HR & business", aliases: ["XLRI"] },
  { name: "FMS Delhi", region: "India", tier: "Tier1", notes: "MBA – University of Delhi", aliases: ["Faculty of Management Studies"] },
  { name: "IISC Bangalore", region: "India", tier: "Tier1", notes: "Science & engineering research", aliases: ["Indian Institute of Science"] },
  { name: "BITS Pilani", region: "India", tier: "Tier1", notes: "Engineering", aliases: ["BITS"] },
  { name: "NIT Trichy", region: "India", tier: "Tier1", notes: "Engineering", aliases: ["NITT"] },
  { name: "NIT Warangal", region: "India", tier: "Tier1", notes: "Engineering", aliases: ["NITW"] },
  { name: "NIT Surathkal", region: "India", tier: "Tier1", notes: "Engineering", aliases: ["NITK"] },
  { name: "SRCC Delhi", region: "India", tier: "Tier1", notes: "Commerce – top undergrad", aliases: ["Shri Ram College of Commerce"] },
  { name: "St. Stephens College Delhi", region: "India", tier: "Tier1", notes: "Liberal arts – top undergrad", aliases: ["Stephens"] },
  { name: "LSR Delhi", region: "India", tier: "Tier1", notes: "Liberal arts – women's college", aliases: ["Lady Shri Ram"] },
  { name: "Hindu College Delhi", region: "India", tier: "Tier1", notes: "Liberal arts", aliases: [] },
  { name: "Jadavpur University", region: "India", tier: "Tier1", notes: "Engineering & arts – Kolkata", aliases: ["JU"] },
  { name: "Presidency University", region: "India", tier: "Tier1", notes: "Arts & science – Kolkata", aliases: ["Presidency College"] },
  { name: "NLSIU Bangalore", region: "India", tier: "Tier1", notes: "Law – India #1", aliases: ["National Law School"] },
  { name: "NALSAR Hyderabad", region: "India", tier: "Tier1", notes: "Law – India top", aliases: [] },
  { name: "NUJS Kolkata", region: "India", tier: "Tier1", notes: "Law – India top", aliases: [] },
  { name: "NLU Delhi", region: "India", tier: "Tier1", notes: "Law", aliases: ["National Law University"] },
  { name: "MDI Gurgaon", region: "India", tier: "Tier2", notes: "MBA", aliases: ["Management Development Institute"] },
  { name: "SP Jain Mumbai", region: "India", tier: "Tier2", notes: "MBA", aliases: ["SPJIMR"] },
  { name: "NMIMS Mumbai", region: "India", tier: "Tier2", notes: "MBA & engineering", aliases: ["Narsee Monjee"] },
  { name: "Symbiosis Pune", region: "India", tier: "Tier2", notes: "MBA", aliases: ["SIBM"] },
  { name: "Great Lakes Chennai", region: "India", tier: "Tier2", notes: "MBA", aliases: [] },
  { name: "TAPMI Manipal", region: "India", tier: "Tier2", notes: "MBA", aliases: [] },
  { name: "IMT Ghaziabad", region: "India", tier: "Tier2", notes: "MBA", aliases: [] },
  { name: "XIMB Bhubaneswar", region: "India", tier: "Tier2", notes: "MBA", aliases: ["Xavier Institute"] },
  { name: "FORE School Delhi", region: "India", tier: "Tier2", notes: "MBA", aliases: [] },
  { name: "KJ Somaiya Mumbai", region: "India", tier: "Tier2", notes: "MBA", aliases: ["Somaiya"] },
  { name: "VIT Vellore", region: "India", tier: "Tier2", notes: "Engineering", aliases: [] },
  { name: "SRM Chennai", region: "India", tier: "Tier2", notes: "Engineering", aliases: [] },
  { name: "Amity University", region: "India", tier: "Tier2", notes: "Multi-discipline", aliases: [] },
  { name: "Manipal University", region: "India", tier: "Tier2", notes: "Engineering & medicine", aliases: ["MAHE"] },
  { name: "Christ University Bangalore", region: "India", tier: "Tier2", notes: "Commerce & management", aliases: [] },
  { name: "NIT Rourkela", region: "India", tier: "Tier2", notes: "Engineering", aliases: ["NITR"] },
  { name: "NIT Calicut", region: "India", tier: "Tier2", notes: "Engineering", aliases: ["NIT Kozhikode"] },
  { name: "NLU Jodhpur", region: "India", tier: "Tier2", notes: "Law", aliases: [] },
  { name: "Harvard University", region: "Global", tier: "Tier1", notes: "Ivy League – all disciplines", aliases: ["Harvard", "HBS"] },
  { name: "MIT", region: "Global", tier: "Tier1", notes: "Engineering & tech", aliases: ["Massachusetts Institute of Technology"] },
  { name: "Stanford University", region: "Global", tier: "Tier1", notes: "Engineering, business, tech", aliases: ["Stanford"] },
  { name: "Wharton School", region: "Global", tier: "Tier1", notes: "MBA – top global", aliases: ["UPenn Wharton"] },
  { name: "London Business School", region: "Global", tier: "Tier1", notes: "MBA – Europe #1", aliases: ["LBS"] },
  { name: "INSEAD", region: "Global", tier: "Tier1", notes: "MBA – global", aliases: [] },
  { name: "Oxford University", region: "Global", tier: "Tier1", notes: "Said Business School", aliases: ["Oxford", "Said"] },
  { name: "Cambridge University", region: "Global", tier: "Tier1", notes: "Judge Business School", aliases: ["Cambridge", "Judge"] },
  { name: "Columbia Business School", region: "Global", tier: "Tier1", notes: "MBA – New York", aliases: ["Columbia"] },
  { name: "Chicago Booth", region: "Global", tier: "Tier1", notes: "MBA – Chicago", aliases: ["Booth School of Business"] },
  { name: "Kellogg School", region: "Global", tier: "Tier1", notes: "MBA – Northwestern", aliases: ["Northwestern Kellogg"] },
  { name: "MIT Sloan", region: "Global", tier: "Tier1", notes: "MBA – tech focus", aliases: ["Sloan"] },
  { name: "Dartmouth Tuck", region: "Global", tier: "Tier1", notes: "MBA", aliases: ["Tuck School"] },
  { name: "HEC Paris", region: "Global", tier: "Tier1", notes: "MBA – France", aliases: [] },
  { name: "IE Business School", region: "Global", tier: "Tier2", notes: "MBA – Spain", aliases: [] },
  { name: "ESADE", region: "Global", tier: "Tier2", notes: "MBA – Spain", aliases: [] },
];

// ─────────────────────────────────────────────────────────────
// MASTER REGISTRY — all companies in one flat array
// ─────────────────────────────────────────────────────────────

export const ALL_COMPANIES: (CompanyEntry & { category: IndustryCategory })[] = [
  ...CONSULTING.map(e => ({ ...e, category: "Consulting" as IndustryCategory })),
  ...INVESTMENT_BANKING.map(e => ({ ...e, category: "InvestmentBanking" as IndustryCategory })),
  ...PE_VC.map(e => ({ ...e, category: "PE_VC" as IndustryCategory })),
  ...TECH_GLOBAL.map(e => ({ ...e, category: "TechGlobal" as IndustryCategory })),
  ...TECH_INDIA.map(e => ({ ...e, category: "TechIndia" as IndustryCategory })),
  ...BANKING_FINANCE.map(e => ({ ...e, category: "BankingFinance" as IndustryCategory })),
  ...FMCG.map(e => ({ ...e, category: "FMCG" as IndustryCategory })),
  ...PHARMA_HEALTH.map(e => ({ ...e, category: "PharmaHealth" as IndustryCategory })),
  ...ENERGY_INFRA.map(e => ({ ...e, category: "EnergyInfra" as IndustryCategory })),
  ...MANUFACTURING_AUTO.map(e => ({ ...e, category: "ManufacturingAuto" as IndustryCategory })),
  ...MEDIA_TELECOM.map(e => ({ ...e, category: "MediaTelecom" as IndustryCategory })),
  ...REAL_ESTATE.map(e => ({ ...e, category: "RealEstate" as IndustryCategory })),
  ...CONGLOMERATES.map(e => ({ ...e, category: "Conglomerates" as IndustryCategory })),
];

// ─────────────────────────────────────────────────────────────
// UTILITY FUNCTIONS
// ─────────────────────────────────────────────────────────────

/**
 * Classify a company name against the registry.
 * Handles exact matches, alias matches, and case-insensitive partial matches.
 * Returns null if no match found — treat unknown companies as Tier3.
 */
export function classifyCompany(name: string): {
  tier: Tier;
  category: IndustryCategory;
  canonicalName: string;
} | null {
  if (!name) return null;
  const normalised = name.toLowerCase().trim();

  for (const entry of ALL_COMPANIES) {
    const entryName = entry.name.toLowerCase();
    // Exact match
    if (entryName === normalised) {
      return { tier: entry.tier, category: entry.category, canonicalName: entry.name };
    }
    // Alias match
    if (entry.aliases.some(a => a.toLowerCase() === normalised)) {
      return { tier: entry.tier, category: entry.category, canonicalName: entry.name };
    }
    // Partial match (entry name contains input or input contains entry name)
    if (entryName.includes(normalised) || normalised.includes(entryName)) {
      return { tier: entry.tier, category: entry.category, canonicalName: entry.name };
    }
  }
  return null;
}

/**
 * Classify an institution name against the registry.
 * Returns null if not found — treat unknown institutions as Tier3.
 */
export function classifyInstitution(name: string): {
  tier: Tier;
  region: "India" | "Global";
  canonicalName: string;
} | null {
  if (!name) return null;
  const normalised = name.toLowerCase().trim();

  for (const entry of INSTITUTIONS) {
    const entryName = entry.name.toLowerCase();
    if (entryName === normalised) {
      return { tier: entry.tier, region: entry.region, canonicalName: entry.name };
    }
    if (entry.aliases.some(a => a.toLowerCase() === normalised)) {
      return { tier: entry.tier, region: entry.region, canonicalName: entry.name };
    }
    if (entryName.includes(normalised) || normalised.includes(entryName)) {
      return { tier: entry.tier, region: entry.region, canonicalName: entry.name };
    }
  }
  return null;
}

/**
 * Get all Tier 1 company names as a flat string array.
 * Useful for prompt injection into Claude context.
 */
export function getTier1CompanyNames(): string[] {
  return ALL_COMPANIES
    .filter(e => e.tier === "Tier1")
    .map(e => e.name);
}

/**
 * Get all Tier 1 institution names as a flat string array.
 */
export function getTier1InstitutionNames(): string[] {
  return INSTITUTIONS
    .filter(e => e.tier === "Tier1")
    .map(e => e.name);
}

/**
 * Get registry stats — useful for debugging and admin dashboards.
 */
export function getRegistryStats() {
  const companyCounts = ALL_COMPANIES.reduce((acc, e) => {
    acc[e.tier] = (acc[e.tier] || 0) + 1;
    return acc;
  }, {} as Record<Tier, number>);

  const institutionCounts = INSTITUTIONS.reduce((acc, e) => {
    acc[e.tier] = (acc[e.tier] || 0) + 1;
    return acc;
  }, {} as Record<Tier, number>);

  return {
    companies: {
      total: ALL_COMPANIES.length,
      ...companyCounts,
    },
    institutions: {
      total: INSTITUTIONS.length,
      ...institutionCounts,
    },
    grandTotal: ALL_COMPANIES.length + INSTITUTIONS.length,
  };
}
