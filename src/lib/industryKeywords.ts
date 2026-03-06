/**
 * industryKeywords.ts
 *
 * Exhaustive India-context keyword repository for SerpApi query generation.
 * Used by serpQueryEngine.ts and sentinel.ts for query building, result scoring,
 * and relevance filtering.
 *
 * Structure per industry:
 *   - roles:        Specific job titles and role names to search for
 *   - companies:    Tier 1 and Tier 2 companies hiring in India for this industry
 *   - skills:       Technical and functional skills associated with the industry
 *   - signals:      Keywords indicating hiring intent or company growth signals
 *   - aliases:      Common abbreviations and alternate names for the industry itself
 *   - negatives:    Keywords that indicate an irrelevant result — used for filtering
 */

export interface IndustryKeywordSet {
  roles: string[];
  companies: string[];
  skills: string[];
  signals: string[];
  aliases: string[];
  negatives: string[];
}

export type IndustryName =
  | "Consulting"
  | "Technology"
  | "Finance"
  | "Marketing"
  | "Operations"
  | "Product"
  | "Data & Analytics"
  | "Investment Banking"
  | "Private Equity & VC"
  | "FMCG"
  | "Pharma & Healthcare"
  | "Energy & Infrastructure"
  | "Media & Entertainment"
  | "Legal"
  | "Human Resources"
  | "Real Estate"
  | "Logistics & Supply Chain"
  | "Other";

export const INDUSTRY_KEYWORDS: Record<IndustryName, IndustryKeywordSet> = {

  // ─────────────────────────────────────────────────────────────────────────
  Consulting: {
    roles: [
      "management consultant", "business analyst", "strategy consultant",
      "associate consultant", "senior consultant", "engagement manager",
      "project leader", "principal", "partner", "junior associate",
      "strategy analyst", "advisory analyst", "solutions consultant",
      "transformation consultant", "operations consultant", "hr consultant",
      "it consultant", "risk consultant", "financial consultant",
      "technology consultant", "consulting analyst", "associate",
      "summer analyst", "summer associate", "consulting intern",
      "research analyst", "policy analyst", "economist",
      "research associate", "knowledge analyst", "sector specialist",
    ],
    companies: [
      // MBB
      "McKinsey", "McKinsey & Company", "Boston Consulting Group", "BCG",
      "Bain & Company", "Bain",
      // Big 4
      "Deloitte", "EY", "Ernst & Young", "KPMG", "PwC", "PricewaterhouseCoopers",
      // Tier 2 strategy
      "Oliver Wyman", "Roland Berger", "Kearney", "Strategy&",
      "LEK Consulting", "Arthur D. Little", "Alvarez & Marsal",
      "FTI Consulting", "Ankura", "Huron Consulting",
      // India-specific
      "Accenture Strategy", "Accenture", "Infosys Consulting",
      "Wipro Consulting", "Tata Consultancy Services", "TCS",
      "Capgemini Invent", "Capgemini", "IBM Consulting", "IBM",
      "KPMG India", "Deloitte India", "EY India", "PwC India",
      "Grant Thornton", "BDO India", "RSM India",
      "Redseer", "Praxis Global Alliance", "Kanvic Consulting",
      "Avalon Consulting", "GEP", "ZS Associates", "ZS",
      "Simon-Kucher", "Analysys Mason", "IQVIA",
      // GCC consulting arms
      "Goldman Sachs GCC", "JPMorgan GCC", "Morgan Stanley GCC",
    ],
    skills: [
      "problem solving", "structured thinking", "case interview",
      "powerpoint", "excel", "financial modelling", "market sizing",
      "due diligence", "business case", "stakeholder management",
      "project management", "data analysis", "research",
      "presentation skills", "client management", "hypothesis driven",
      "mece", "issue tree", "benchmarking", "competitive analysis",
      "go to market", "gtm", "cost optimisation", "process improvement",
      "change management", "post merger integration", "pmi",
      "digital transformation", "agile", "lean", "six sigma",
      "python", "sql", "tableau", "alteryx", "vba",
    ],
    signals: [
      "consulting", "consultant", "advisory", "strategy",
      "management consulting", "big 4", "mbb", "strategy consulting",
      "business transformation", "digital consulting",
    ],
    aliases: [
      "mgmt consulting", "management consulting", "strategy consulting",
      "advisory", "big4", "big 4", "mbb",
    ],
    negatives: [
      "sales consultant", "insurance consultant", "real estate consultant",
      "beauty consultant", "retail consultant", "loan consultant",
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  Technology: {
    roles: [
      "software engineer", "software developer", "sde", "sde-1", "sde-2",
      "backend engineer", "frontend engineer", "full stack engineer",
      "full stack developer", "ios developer", "android developer",
      "mobile developer", "devops engineer", "site reliability engineer",
      "sre", "cloud engineer", "data engineer", "ml engineer",
      "machine learning engineer", "ai engineer", "research engineer",
      "platform engineer", "infrastructure engineer", "security engineer",
      "solutions engineer", "technical program manager", "tpm",
      "engineering manager", "tech lead", "staff engineer",
      "principal engineer", "distinguished engineer", "vp engineering",
      "cto", "product engineer", "growth engineer", "qa engineer",
      "quality assurance engineer", "test engineer", "sdet",
      "blockchain developer", "web3 developer", "embedded engineer",
      "firmware engineer", "robotics engineer", "computer vision engineer",
      "nlp engineer", "software intern", "engineering intern",
    ],
    companies: [
      // Global tech in India
      "Google", "Microsoft", "Amazon", "Meta", "Apple", "Netflix",
      "Adobe", "Salesforce", "Oracle", "SAP", "Cisco", "VMware",
      "Intel", "Qualcomm", "Texas Instruments", "Dell", "HP",
      "IBM", "Accenture", "Capgemini", "Cognizant", "Infosys",
      "Wipro", "HCL", "TCS", "Tech Mahindra", "Mphasis", "Hexaware",
      "LTIMindtree", "Persistent Systems", "Coforge", "NIIT Technologies",
      // India unicorns and growth stage
      "Flipkart", "Swiggy", "Zomato", "PhonePe", "Razorpay",
      "CRED", "Zepto", "Blinkit", "Dunzo", "Urban Company",
      "Meesho", "Nykaa", "Boat", "ShareChat", "Dailyhunt",
      "Dream11", "Games24x7", "MPL", "Paytm", "PolicyBazaar",
      "Groww", "Zerodha", "Upstox", "Angel One", "Fi Money",
      "Slice", "Jupiter", "Niyo", "Open", "RazorpayX",
      "Ola", "Rapido", "Porter", "Shiprocket", "Delhivery",
      "Browserstack", "Postman", "Chargebee", "Freshworks",
      "Zoho", "Kissflow", "Clevertap", "MoEngage", "WebEngage",
      "Lenskart", "Mamaearth", "Mensa Brands", "GlobalBees",
      "Darwinbox", "Leadsquared", "Hasura", "Setu", "Cashfree",
      "Juspay", "Nium", "Yubi", "CredAvenue", "Rupeek",
      "Zetwerk", "Infra.Market", "Moglix", "OfBusiness",
      "Byju's", "Unacademy", "PhysicsWallah", "Vedantu", "Scaler",
      "Springboard", "Simplilearn", "UpGrad",
    ],
    skills: [
      "python", "java", "javascript", "typescript", "golang", "go",
      "rust", "c++", "c#", "ruby", "scala", "kotlin", "swift",
      "react", "react native", "angular", "vue", "node.js", "nodejs",
      "django", "flask", "fastapi", "spring boot", "spring",
      "aws", "azure", "gcp", "google cloud", "kubernetes", "docker",
      "terraform", "ansible", "ci/cd", "jenkins", "github actions",
      "postgresql", "mysql", "mongodb", "redis", "elasticsearch",
      "kafka", "rabbitmq", "spark", "hadoop", "airflow",
      "microservices", "rest api", "graphql", "grpc",
      "machine learning", "deep learning", "pytorch", "tensorflow",
      "scikit-learn", "nlp", "computer vision", "llm",
      "data structures", "algorithms", "system design", "lld", "hld",
      "git", "linux", "bash", "shell scripting",
    ],
    signals: [
      "software", "tech", "engineering", "developer", "programmer",
      "coding", "build", "scale", "startup", "saas", "platform",
      "api", "open source", "agile", "scrum",
    ],
    aliases: [
      "it", "software", "tech", "engineering", "it industry",
      "software industry", "tech industry", "it sector",
    ],
    negatives: [
      "sales engineer", "presales", "hardware sales", "tech support level 1",
      "data entry", "bpo", "call centre",
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  Finance: {
    roles: [
      "financial analyst", "finance analyst", "equity analyst",
      "research analyst", "credit analyst", "risk analyst",
      "investment analyst", "treasury analyst", "fp&a analyst",
      "financial planning and analysis", "business finance",
      "finance manager", "cfo", "vp finance", "director finance",
      "chartered accountant", "ca", "cost accountant", "cma",
      "company secretary", "cs", "cfa", "actuarial analyst",
      "actuary", "quantitative analyst", "quant", "risk manager",
      "compliance analyst", "compliance officer", "audit associate",
      "statutory auditor", "internal auditor", "tax consultant",
      "direct tax", "indirect tax", "gst consultant",
      "corporate finance", "m&a analyst", "deal analyst",
      "valuation analyst", "finance intern", "ca articleship",
    ],
    companies: [
      // Global banks in India
      "Goldman Sachs", "Morgan Stanley", "JP Morgan", "JPMorgan",
      "Citi", "Citibank", "Barclays", "Deutsche Bank", "UBS",
      "Credit Suisse", "HSBC", "Standard Chartered", "BNP Paribas",
      "Bank of America", "Wells Fargo", "Nomura", "Macquarie",
      // Indian banks
      "HDFC Bank", "ICICI Bank", "Kotak Mahindra Bank", "Axis Bank",
      "State Bank of India", "SBI", "Bank of Baroda", "Punjab National Bank",
      "Yes Bank", "IndusInd Bank", "Federal Bank", "RBL Bank",
      "IDFC First Bank", "AU Small Finance Bank", "Bandhan Bank",
      // NBFCs and fintechs
      "Bajaj Finance", "Bajaj Finserv", "HDFC Ltd", "LIC Housing Finance",
      "Muthoot Finance", "Manappuram Finance", "Shriram Finance",
      "Aditya Birla Finance", "Tata Capital", "L&T Finance",
      // Asset management
      "SBI Mutual Fund", "HDFC AMC", "ICICI Prudential AMC",
      "Kotak AMC", "Nippon India AMC", "Axis AMC", "DSP",
      "Mirae Asset", "Edelweiss", "Motilal Oswal",
      // Brokerage and wealth
      "Zerodha", "Groww", "Upstox", "Angel One", "IIFL",
      "Sharekhan", "5paisa", "Nuvama", "JM Financial",
      // Insurance
      "LIC", "SBI Life", "HDFC Life", "ICICI Prudential Life",
      "Bajaj Allianz", "New India Assurance", "Star Health",
    ],
    skills: [
      "financial modelling", "valuation", "dcf", "lbo", "merger model",
      "excel", "vba", "bloomberg", "capital iq", "factset",
      "accounting", "ifrs", "ind as", "gaap", "p&l", "balance sheet",
      "cash flow", "ratio analysis", "credit analysis",
      "risk management", "var", "derivatives", "options", "futures",
      "fixed income", "equity research", "sector research",
      "python", "sql", "r", "matlab", "tableau",
      "gst", "direct tax", "transfer pricing", "tds",
      "fund accounting", "nav calculation", "sebi regulations",
      "rbi regulations", "fema", "companies act",
    ],
    signals: [
      "finance", "financial", "banking", "investment", "capital markets",
      "equity", "debt", "credit", "treasury", "accounting",
      "audit", "tax", "compliance", "regulatory",
    ],
    aliases: [
      "banking", "financial services", "bfsi", "banking finance insurance",
      "capital markets", "wealth management",
    ],
    negatives: [
      "microfinance field officer", "loan recovery", "insurance agent",
      "insurance sales", "direct selling agent", "dsa",
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  Marketing: {
    roles: [
      "marketing manager", "brand manager", "product marketing manager",
      "digital marketing manager", "growth manager", "growth hacker",
      "performance marketing manager", "seo specialist", "sem specialist",
      "social media manager", "content marketing manager",
      "content strategist", "content writer", "copywriter",
      "marketing analyst", "marketing analyst", "crm manager",
      "email marketing specialist", "affiliate marketing manager",
      "influencer marketing manager", "community manager",
      "category manager", "shopper marketing", "trade marketing",
      "brand strategist", "marketing communications", "marcom",
      "media planner", "media buyer", "programmatic specialist",
      "marketing intern", "brand intern", "growth intern",
    ],
    companies: [
      // FMCG / consumer
      "Hindustan Unilever", "HUL", "ITC", "Nestle India", "P&G",
      "Procter & Gamble", "Marico", "Dabur", "Emami", "Godrej Consumer",
      "Colgate Palmolive", "Reckitt", "Britannia", "Parle",
      "Tata Consumer Products", "Amul", "Mother Dairy",
      // D2C brands
      "Mamaearth", "Nykaa", "Boat", "Noise", "Fire-Boltt",
      "Lenskart", "Wakefit", "Urban Company", "Bombay Shaving Company",
      "mCaffeine", "Wow Skin Science", "Plum", "Minimalist",
      "Bira91", "Paper Boat", "Epigamia",
      // Agencies
      "Ogilvy", "JWT", "Leo Burnett", "McCann", "DDB Mudra",
      "BBDO India", "Grey India", "Wunderman Thompson",
      "Dentsu", "Publicis", "Havas", "Lowe Lintas",
      "Social Beat", "iProspect", "WATConsult",
      // Tech companies with strong marketing teams
      "Google", "Meta", "Swiggy", "Zomato", "Flipkart",
      "Paytm", "CRED", "Meesho",
    ],
    skills: [
      "google ads", "meta ads", "facebook ads", "instagram ads",
      "google analytics", "ga4", "mixpanel", "clevertap", "moengage",
      "seo", "sem", "ppc", "cpc", "cpm", "roas", "roi",
      "email marketing", "hubspot", "mailchimp", "marketo",
      "salesforce marketing cloud", "crm",
      "content creation", "copywriting", "brand storytelling",
      "market research", "consumer insights", "a/b testing",
      "product positioning", "go to market", "gtm",
      "excel", "powerpoint", "canva", "figma",
      "influencer marketing", "affiliate marketing",
      "social media", "community building", "virality",
      "cohort analysis", "funnel optimisation", "ltv", "cac",
    ],
    signals: [
      "marketing", "brand", "growth", "digital", "content",
      "performance", "acquisition", "retention", "engagement",
      "awareness", "campaign", "media",
    ],
    aliases: [
      "digital marketing", "brand management", "growth marketing",
      "performance marketing", "content marketing",
    ],
    negatives: [
      "field marketing executive", "direct marketing agent",
      "telemarketing", "door to door", "cold calling sales",
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  Operations: {
    roles: [
      "operations manager", "operations analyst", "ops analyst",
      "business operations", "supply chain analyst", "supply chain manager",
      "logistics manager", "procurement manager", "sourcing manager",
      "category manager", "demand planner", "inventory manager",
      "warehouse manager", "fulfillment manager", "last mile manager",
      "fleet manager", "vendor manager", "vendor development",
      "quality manager", "process excellence", "lean manager",
      "six sigma analyst", "continuous improvement",
      "plant manager", "production manager", "manufacturing engineer",
      "industrial engineer", "project manager", "pmo analyst",
      "strategy and operations", "city operations", "cluster manager",
      "operations intern", "supply chain intern",
    ],
    companies: [
      // Conglomerates
      "Tata Group", "Tata Sons", "Tata Steel", "Tata Motors",
      "Mahindra & Mahindra", "Mahindra", "Reliance Industries",
      "Adani Group", "Larsen & Toubro", "L&T", "Aditya Birla Group",
      "JSW Group", "Hindalco", "Vedanta", "ONGC", "NTPC", "BHEL",
      // Logistics
      "Delhivery", "BlueDart", "DTDC", "Ecom Express", "XpressBees",
      "Shadowfax", "Porter", "Dunzo", "Shiprocket", "Maersk India",
      "DHL India", "FedEx India", "UPS India",
      // Manufacturing and auto
      "Maruti Suzuki", "Hyundai India", "Bajaj Auto", "Hero MotoCorp",
      "TVS Motor", "Royal Enfield", "Ashok Leyland", "Eicher Motors",
      "Bosch India", "Minda Industries", "Motherson Sumi",
      // Retail and ecommerce ops
      "Amazon India", "Flipkart", "Meesho", "Swiggy", "Zomato",
      "BigBasket", "Blinkit", "Zepto", "DMart", "Reliance Retail",
      "Future Group", "Spencer's", "More Retail",
    ],
    skills: [
      "supply chain management", "scm", "erp", "sap", "oracle",
      "demand forecasting", "inventory optimisation", "s&op",
      "procurement", "vendor management", "sourcing", "rfq", "rfp",
      "logistics", "warehousing", "last mile delivery",
      "lean manufacturing", "six sigma", "kaizen", "5s", "tpm",
      "project management", "pmp", "prince2", "agile",
      "excel", "sql", "power bi", "tableau",
      "process mapping", "process improvement", "bpr",
      "quality management", "iso", "brc", "haccp",
      "data analysis", "kpi management", "ops metrics",
    ],
    signals: [
      "operations", "supply chain", "logistics", "procurement",
      "manufacturing", "production", "distribution", "fulfillment",
      "warehouse", "inventory", "delivery", "fleet",
    ],
    aliases: [
      "ops", "scm", "supply chain", "logistics", "manufacturing ops",
    ],
    negatives: [
      "field sales executive", "telecaller", "data entry operator",
      "back office", "bpo operations",
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  Product: {
    roles: [
      "product manager", "product management", "pm", "apm",
      "associate product manager", "senior product manager",
      "principal product manager", "group product manager", "gpm",
      "director of product", "vp product", "chief product officer", "cpo",
      "product analyst", "product operations", "product ops",
      "product designer", "ux designer", "ui designer", "ux researcher",
      "product marketing manager", "technical product manager",
      "growth product manager", "platform product manager",
      "consumer product manager", "b2b product manager",
      "product intern", "apm intern",
    ],
    companies: [
      "Google", "Microsoft", "Meta", "Amazon", "Apple", "Netflix",
      "Flipkart", "Swiggy", "Zomato", "PhonePe", "Razorpay",
      "CRED", "Zepto", "Meesho", "ShareChat", "Dailyhunt",
      "Dream11", "Paytm", "PolicyBazaar", "Groww", "Zerodha",
      "Freshworks", "Zoho", "BrowserStack", "Postman",
      "Chargebee", "Clevertap", "MoEngage", "WebEngage",
      "Lenskart", "Nykaa", "UrbanClap", "Urban Company",
      "Ola", "Rapido", "Porter", "Delhivery", "Shiprocket",
      "Byju's", "Unacademy", "PhysicsWallah", "Scaler", "UpGrad",
      "Darwinbox", "Leadsquared", "Setu", "Juspay", "Cashfree",
      "Zetwerk", "Infra.Market", "OfBusiness", "Moglix",
    ],
    skills: [
      "product roadmap", "product strategy", "user research",
      "user interviews", "usability testing", "ux", "ui",
      "wireframing", "prototyping", "figma", "miro",
      "agile", "scrum", "kanban", "sprint planning",
      "jira", "confluence", "notion", "asana",
      "data analysis", "sql", "python", "excel",
      "a/b testing", "experimentation", "hypothesis testing",
      "metrics", "kpis", "okrs", "north star metric",
      "go to market", "gtm", "pricing", "positioning",
      "competitive analysis", "market research",
      "stakeholder management", "cross functional",
      "prd", "brd", "product requirements", "user stories",
      "funnel analysis", "cohort analysis", "retention",
      "growth loops", "virality", "network effects",
      "api", "technical understanding", "system design basics",
    ],
    signals: [
      "product", "product management", "pm role", "apm",
      "product thinking", "user experience", "customer experience",
      "build product", "product led growth", "plg",
    ],
    aliases: [
      "product management", "pm", "apm program",
      "product design", "ux design",
    ],
    negatives: [
      "physical product", "manufacturing product", "product sales",
      "product demonstration", "product trainer",
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  "Data & Analytics": {
    roles: [
      "data analyst", "data scientist", "data engineer",
      "analytics engineer", "business intelligence analyst", "bi analyst",
      "business analyst", "quantitative analyst", "statistical analyst",
      "ml engineer", "machine learning engineer", "ai engineer",
      "research scientist", "applied scientist", "nlp engineer",
      "computer vision engineer", "decision scientist",
      "analytics manager", "data science manager", "head of analytics",
      "chief data officer", "cdo", "data architect",
      "database administrator", "dba", "etl developer",
      "data platform engineer", "analytics intern", "data intern",
    ],
    companies: [
      // Pure analytics firms
      "Mu Sigma", "Tiger Analytics", "Fractal Analytics",
      "Absolutdata", "Bridgei2i", "Crayon Data", "Latent View",
      "EXL Analytics", "WNS Analytics", "Genpact Analytics",
      "Accenture Analytics", "Deloitte Analytics",
      // Tech companies with strong data teams
      "Google", "Microsoft", "Amazon", "Meta", "Adobe",
      "Flipkart", "Swiggy", "Zomato", "PhonePe", "Razorpay",
      "CRED", "Meesho", "Dream11",
      // Consulting analytics
      "McKinsey Analytics", "BCG Gamma", "BCG GAMMA",
      "Bain Analytics", "ZS Associates",
      // Research
      "Nielsen India", "Kantar India", "IMRB",
      "IDC India", "Gartner India",
    ],
    skills: [
      "python", "r", "sql", "spark", "hadoop", "hive",
      "pandas", "numpy", "scikit-learn", "tensorflow", "pytorch",
      "keras", "xgboost", "lightgbm", "statsmodels",
      "tableau", "power bi", "looker", "qlikview", "metabase",
      "excel", "vba", "google sheets",
      "airflow", "dbt", "kafka", "databricks", "snowflake",
      "bigquery", "redshift", "aws", "azure", "gcp",
      "statistics", "probability", "regression", "classification",
      "clustering", "nlp", "time series", "forecasting",
      "a/b testing", "hypothesis testing", "experimentation",
      "data visualisation", "storytelling with data",
      "machine learning", "deep learning", "neural networks",
      "feature engineering", "model deployment", "mlops",
      "causal inference", "bayesian statistics",
    ],
    signals: [
      "data", "analytics", "insights", "intelligence",
      "machine learning", "ai", "artificial intelligence",
      "modelling", "statistical", "quantitative",
    ],
    aliases: [
      "data science", "analytics", "business intelligence", "bi",
      "data analytics", "ml", "ai ml", "big data",
    ],
    negatives: [
      "data entry", "data operator", "data capture",
      "data punching", "back office data",
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  "Investment Banking": {
    roles: [
      "investment banking analyst", "ib analyst", "investment banker",
      "associate investment banking", "vice president ib",
      "senior associate ib", "ib associate", "deal team member",
      "m&a analyst", "mergers and acquisitions analyst",
      "ecm analyst", "equity capital markets", "dcm analyst",
      "debt capital markets", "leveraged finance analyst",
      "restructuring analyst", "coverage analyst",
      "sector banker", "financial sponsor coverage",
      "ib intern", "summer analyst investment banking",
    ],
    companies: [
      "Goldman Sachs", "Morgan Stanley", "JP Morgan", "JPMorgan Chase",
      "Citi", "Citibank", "Barclays", "Deutsche Bank",
      "Bank of America Merrill Lynch", "BofA", "UBS", "Credit Suisse",
      "HSBC", "Standard Chartered", "BNP Paribas", "Nomura",
      "Macquarie", "Jefferies", "Lazard", "Rothschild",
      "Houlihan Lokey", "Moelis", "Evercore", "PJT Partners",
      // India-focused IBs
      "Kotak Investment Banking", "Axis Capital", "ICICI Securities",
      "SBI Capital Markets", "IDBI Capital", "JM Financial",
      "IIFL Investment Banking", "Emkay", "Systematix",
      "Nuvama", "MOFSL", "Motilal Oswal Investment Banking",
      "DAM Capital", "Edelweiss Financial Services",
      "IndiaBulls", "Centrum Capital", "Anand Rathi",
    ],
    skills: [
      "financial modelling", "dcf", "lbo", "m&a modelling",
      "comparable company analysis", "precedent transactions",
      "pitch book", "cim", "information memorandum",
      "bloomberg", "capital iq", "factset", "refinitiv",
      "excel", "powerpoint", "vba",
      "valuation", "corporate finance", "accounting",
      "sebi", "rbi", "fema", "companies act", "ibc",
      "debt structuring", "equity structuring",
      "ipo process", "qip", "rights issue", "fpo",
      "pe ratio", "ev/ebitda", "p/b", "roe", "roce",
    ],
    signals: [
      "investment banking", "ib", "m&a", "mergers acquisitions",
      "capital markets", "deal making", "ipo", "ecm", "dcm",
      "leveraged finance", "restructuring", "advisory mandate",
    ],
    aliases: [
      "ib", "investment banking", "m&a", "capital markets",
      "corporate finance advisory",
    ],
    negatives: [
      "retail banking", "branch banking", "personal banking",
      "relationship manager retail", "bancassurance",
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  "Private Equity & VC": {
    roles: [
      "private equity analyst", "pe analyst", "investment analyst",
      "venture capital analyst", "vc analyst", "deal sourcing analyst",
      "portfolio analyst", "growth equity analyst",
      "associate private equity", "associate vc",
      "vice president pe", "principal pe",
      "investment manager", "fund manager",
      "portfolio company manager", "value creation",
      "pe intern", "vc intern", "investment intern",
    ],
    companies: [
      // Global PE in India
      "KKR India", "Blackstone India", "Carlyle India",
      "Warburg Pincus India", "General Atlantic India",
      "TPG Capital India", "Apax Partners India",
      "Advent International India", "CVC Capital India",
      "Bain Capital India", "Apollo India",
      // India-focused PE
      "Sequoia Capital India", "Sequoia India",
      "Accel India", "Matrix Partners India",
      "SAIF Partners", "Lightspeed India",
      "Nexus Venture Partners", "Kalaari Capital",
      "Bessemer India", "Elevation Capital",
      "Blume Ventures", "Chiratae Ventures",
      "India Quotient", "100X.VC", "Artha Venture Fund",
      "Stellaris Venture Partners", "Prime Venture Partners",
      // Family offices and alternatives
      "Piramal Alternatives", "Multiples PE",
      "ChrysCapital", "Motilal Oswal PE",
      "Edelweiss PE", "IIFL PE", "Kotak PE",
    ],
    skills: [
      "financial modelling", "lbo model", "dcf", "valuation",
      "due diligence", "commercial due diligence", "financial due diligence",
      "term sheet", "shareholder agreement", "sha",
      "cap table", "waterfall modelling", "irr", "moic",
      "portfolio monitoring", "board reporting",
      "investment thesis", "deal sourcing", "deal flow",
      "market mapping", "sector research",
      "excel", "powerpoint", "bloomberg", "capital iq",
      "companies act", "sebi aif regulations", "fema",
    ],
    signals: [
      "private equity", "venture capital", "pe", "vc",
      "fund", "portfolio", "investment", "deal",
      "growth equity", "buyout", "minority stake",
      "exit", "ipo", "secondary", "co-invest",
    ],
    aliases: [
      "pe", "vc", "private equity", "venture capital",
      "growth equity", "alternative investments",
    ],
    negatives: [
      "mutual fund sales", "insurance investment",
      "retail investment advisor", "financial planner retail",
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  FMCG: {
    roles: [
      "brand manager", "assistant brand manager", "abm",
      "category manager", "category development manager",
      "trade marketing manager", "shopper marketing manager",
      "key accounts manager", "national accounts manager",
      "sales manager", "area sales manager", "asm",
      "territory sales manager", "regional sales manager",
      "channel development manager", "distributor manager",
      "rural sales manager", "modern trade manager",
      "e-commerce key accounts", "commercial manager",
      "supply chain manager fmcg", "demand planning fmcg",
      "r&d manager fmcg", "product development manager",
      "quality assurance manager fmcg", "regulatory affairs",
      "fmcg intern", "management trainee fmcg",
    ],
    companies: [
      "Hindustan Unilever", "HUL", "ITC", "Nestle India",
      "Procter & Gamble", "P&G", "Marico", "Dabur India",
      "Emami", "Godrej Consumer Products", "Godrej Industries",
      "Colgate Palmolive India", "Reckitt Benckiser",
      "Britannia Industries", "Parle Products",
      "Tata Consumer Products", "Tata Salt", "Tata Tea",
      "Amul", "Mother Dairy", "Patanjali", "Himalaya",
      "Pepsico India", "Coca-Cola India", "Red Bull India",
      "Mondelez India", "Ferrero India", "Mars India",
      "Bata India", "VIP Industries", "Safari Industries",
      "Relaxo Footwears", "Liberty Shoes",
      "Asian Paints", "Berger Paints", "Pidilite Industries",
      "Jyothy Laboratories", "Bajaj Consumer Care",
      "CavinKare", "Nirma", "RSPL Group",
    ],
    skills: [
      "brand management", "trade marketing", "category management",
      "consumer insights", "market research", "nielsen", "kantar",
      "brand p&l", "a&p budgeting", "advertising and promotion",
      "go to market", "gtm", "channel strategy", "gt", "mt", "ecom",
      "general trade", "modern trade", "ecommerce",
      "distributor management", "stockist", "rtm",
      "sales forecasting", "s&op", "demand planning",
      "excel", "powerpoint", "tableau", "sap",
      "new product development", "npd", "innovation pipeline",
      "consumer behaviour", "shopper behaviour",
      "pricing strategy", "pack architecture",
    ],
    signals: [
      "fmcg", "consumer goods", "brand", "category",
      "trade", "sales", "distribution", "retail",
      "consumer", "household", "personal care", "food and beverage",
    ],
    aliases: [
      "fmcg", "consumer goods", "cpg", "consumer packaged goods",
      "household products", "personal care", "food & beverages",
    ],
    negatives: [
      "pharma sales rep", "medical representative",
      "insurance sales", "real estate sales",
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  "Pharma & Healthcare": {
    roles: [
      "medical representative", "mr", "pharma sales",
      "product manager pharma", "brand manager pharma",
      "regulatory affairs manager", "ra manager",
      "clinical research associate", "cra", "clinical data manager",
      "medical affairs manager", "medical science liaison", "msl",
      "pharmacovigilance analyst", "pv analyst",
      "quality assurance pharma", "qa pharma",
      "formulation scientist", "r&d scientist pharma",
      "drug safety analyst", "clinical trials manager",
      "healthcare consultant", "hospital administrator",
      "health economist", "market access manager",
      "pharma analyst", "pharma intern",
    ],
    companies: [
      // Indian pharma
      "Sun Pharma", "Cipla", "Dr. Reddy's Laboratories",
      "Lupin", "Aurobindo Pharma", "Divi's Laboratories",
      "Biocon", "Cadila Healthcare", "Zydus Lifesciences",
      "Torrent Pharmaceuticals", "Alkem Laboratories",
      "Abbott India", "Pfizer India", "Novartis India",
      "AstraZeneca India", "Sanofi India", "GlaxoSmithKline India",
      "Johnson & Johnson India", "Roche India", "MSD India",
      "Eli Lilly India", "Bristol Myers Squibb India",
      // Healthcare providers
      "Apollo Hospitals", "Fortis Healthcare", "Max Healthcare",
      "Manipal Hospitals", "Aster DM Healthcare",
      "Narayana Health", "KIMS Hospitals", "Medanta",
      // Health tech
      "Practo", "1mg", "PharmEasy", "Medlife", "Healthkart",
      "Portea Medical", "MFine", "Niramai", "SigTuple",
    ],
    skills: [
      "clinical research", "gcp", "ich guidelines", "fda regulations",
      "cdsco", "drug master file", "dmf", "anda", "nda",
      "regulatory submissions", "dossier preparation",
      "pharmacovigilance", "adverse event reporting",
      "medical writing", "clinical data management", "cdm",
      "sas", "r", "spss", "medidata rave", "oracle clinical",
      "quality management", "gmp", "gdp",
      "market research pharma", "health economics", "heor",
      "disease area expertise", "kol management",
    ],
    signals: [
      "pharma", "pharmaceutical", "healthcare", "clinical",
      "medical", "drug", "regulatory", "biotech", "lifesciences",
      "hospital", "health", "patient",
    ],
    aliases: [
      "pharma", "pharmaceutical", "healthcare", "life sciences",
      "biotech", "medtech", "healthtech",
    ],
    negatives: [
      "medical equipment sales basic", "hospital housekeeping",
      "ward boy", "patient attendant",
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  "Energy & Infrastructure": {
    roles: [
      "project engineer", "site engineer", "civil engineer",
      "structural engineer", "electrical engineer", "mechanical engineer",
      "epc project manager", "construction manager",
      "renewable energy analyst", "solar analyst", "wind analyst",
      "energy consultant", "power sector analyst",
      "oil and gas analyst", "upstream analyst", "downstream analyst",
      "sustainability analyst", "esg analyst", "green finance analyst",
      "infrastructure analyst", "infrastructure finance",
      "ppp analyst", "public private partnership",
      "transmission engineer", "distribution engineer",
      "smart grid analyst", "energy storage analyst",
      "carbon credits analyst", "climate finance",
    ],
    companies: [
      // Energy
      "ONGC", "Indian Oil", "BPCL", "HPCL", "Reliance Industries",
      "Adani Green Energy", "Adani Transmission", "Adani Gas",
      "Tata Power", "NTPC", "Power Grid Corporation",
      "NHPC", "SJVN", "Torrent Power", "CESC",
      "ReNew Power", "Greenko", "Acme Solar",
      "Azure Power", "Amp Energy", "Avaada Energy",
      "Suzlon Energy", "Inox Wind", "Envision Energy",
      // Oil & Gas
      "Shell India", "ExxonMobil India", "TotalEnergies India",
      "Cairn Oil & Gas", "Vedanta Energy", "GAIL India",
      // Infrastructure
      "L&T Construction", "Gammon India", "NCC Limited",
      "IRB Infrastructure", "GMR Group", "GVK Group",
      "Macrotech Developers", "DLF", "Godrej Properties",
      "National Highways Authority", "NHAI",
    ],
    skills: [
      "project management", "pmp", "prince2",
      "autocad", "revit", "staad pro", "etabs", "ansys",
      "construction management", "ms project", "primavera",
      "epc", "procurement", "contract management",
      "renewable energy", "solar pv", "wind turbine",
      "power systems", "grid integration", "scada",
      "financial modelling energy", "project finance",
      "esg reporting", "gri", "tcfd", "carbon accounting",
      "environmental impact assessment", "eia",
    ],
    signals: [
      "energy", "power", "renewable", "solar", "wind",
      "infrastructure", "construction", "engineering",
      "oil gas", "petroleum", "epc", "greenfield", "brownfield",
    ],
    aliases: [
      "energy", "power sector", "renewables", "oil and gas",
      "infrastructure", "epc", "construction",
    ],
    negatives: [
      "energy drinks sales", "petroleum pump attendant",
      "electrician helper", "construction labour",
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  "Media & Entertainment": {
    roles: [
      "content writer", "journalist", "reporter", "editor",
      "video editor", "motion graphics designer",
      "social media manager", "content creator",
      "digital content strategist", "ott analyst",
      "media planner", "media buyer", "programmatic analyst",
      "account manager media", "business development media",
      "producer", "executive producer", "associate producer",
      "creative director", "art director",
      "public relations manager", "pr manager",
      "communications manager", "corporate communications",
      "media research analyst", "audience insights",
      "gaming analyst", "esports analyst",
      "media intern", "content intern", "pr intern",
    ],
    companies: [
      // Digital media
      "Times Internet", "Times of India", "The Hindu",
      "HT Media", "Hindustan Times", "India Today Group",
      "Network18", "TV18", "CNBC-TV18", "CNN-News18",
      "NDTV", "ABP Group", "Zee Media", "Zee Entertainment",
      "Sony India", "Star India", "Disney Star",
      // OTT
      "Netflix India", "Amazon Prime Video India",
      "Hotstar", "Disney+ Hotstar", "SonyLIV", "Zee5",
      "MX Player", "Voot", "JioCinema", "ALTBalaji",
      "Aha", "Hoichoi", "Manorama Max",
      // Digital native
      "Scroll", "The Wire", "The Print", "Quint",
      "Vice India", "Buzzfeed India", "ScoopWhoop",
      "iDiva", "Femina", "Outlook Group",
      "Josh", "Moj", "ShareChat", "Dailyhunt",
      // Advertising and PR
      "Ogilvy PR", "Weber Shandwick", "Edelman India",
      "Adfactors PR", "Concept PR", "Genesis BCW",
    ],
    skills: [
      "content creation", "copywriting", "storytelling",
      "seo", "content seo", "video production",
      "adobe premiere pro", "final cut pro", "davinci resolve",
      "adobe after effects", "adobe photoshop", "canva",
      "social media management", "instagram", "youtube",
      "analytics", "google analytics", "social analytics",
      "media planning", "dv360", "the trade desk",
      "pr writing", "press releases", "media relations",
      "brand communication", "crisis communication",
      "podcast production", "audio editing",
    ],
    signals: [
      "media", "entertainment", "content", "journalism",
      "ott", "streaming", "broadcast", "digital media",
      "pr", "communications", "advertising", "creative",
    ],
    aliases: [
      "media", "entertainment", "digital media", "ott",
      "journalism", "pr", "communications", "creative industry",
    ],
    negatives: [
      "cable operator", "dth technician",
      "newspaper delivery", "printing press operator",
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  Legal: {
    roles: [
      "associate lawyer", "junior associate", "legal associate",
      "corporate lawyer", "corporate counsel",
      "in-house counsel", "legal counsel", "general counsel", "gc",
      "legal manager", "legal head", "deputy general counsel",
      "contracts manager", "legal contracts",
      "compliance manager", "compliance officer",
      "regulatory affairs lawyer", "sebi compliance",
      "rbi compliance", "intellectual property lawyer",
      "ip analyst", "trademark analyst", "patent analyst",
      "litigation associate", "dispute resolution",
      "arbitration associate", "international arbitration",
      "m&a lawyer", "banking and finance lawyer",
      "legal intern", "law clerk",
    ],
    companies: [
      // Magic circle and tier 1 India
      "AZB & Partners", "Cyril Amarchand Mangaldas",
      "Shardul Amarchand Mangaldas", "Khaitan & Co",
      "S&R Associates", "Trilegal", "IndusLaw",
      "J Sagar Associates", "JSA", "Luthra & Luthra",
      "L&L Partners", "Anand and Anand",
      "Lakshmikumaran & Sridharan", "Fox Mandal",
      "Economic Laws Practice", "ELP",
      "Majmudar & Partners", "Nishith Desai Associates",
      "Desai & Diwanji", "Rajani Associates",
      // Global firms in India
      "Baker McKenzie India", "Allen & Overy India",
      "Clifford Chance India", "Herbert Smith Freehills India",
      // In-house
      "Tata Legal", "Reliance Industries Legal",
      "HDFC Bank Legal", "Infosys Legal", "Wipro Legal",
    ],
    skills: [
      "legal research", "legal drafting", "contract drafting",
      "due diligence legal", "transaction documents",
      "companies act", "sebi regulations", "rbi regulations",
      "fema", "competition law", "ibc", "insolvency",
      "intellectual property", "trademark", "patent", "copyright",
      "arbitration", "litigation", "dispute resolution",
      "employment law", "labour law", "data protection",
      "privacy law", "pdpb", "gdpr",
      "westlaw", "manupatra", "scc online", "lexisnexis",
    ],
    signals: [
      "legal", "law", "lawyer", "counsel", "attorney",
      "compliance", "regulatory", "litigation", "corporate law",
      "ip", "intellectual property", "contract",
    ],
    aliases: [
      "legal", "law", "legal services", "corporate law",
      "in-house legal", "compliance",
    ],
    negatives: [
      "legal process outsourcing entry level", "paralegal data entry",
      "document review basic", "lpo bpo",
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  "Human Resources": {
    roles: [
      "hr generalist", "hr business partner", "hrbp",
      "talent acquisition specialist", "recruiter",
      "technical recruiter", "campus recruiter",
      "hr operations", "hr analyst", "people analytics",
      "compensation and benefits", "c&b analyst",
      "learning and development", "l&d manager",
      "organisational development", "od manager",
      "hr manager", "hr director", "chief people officer", "cpo",
      "employee engagement manager", "culture manager",
      "diversity and inclusion", "dei manager",
      "workforce planning analyst", "hr technology",
      "hr tech", "hris analyst", "workday analyst",
      "hr intern", "talent acquisition intern",
    ],
    companies: [
      "Darwinbox", "Keka HR", "greytHR", "HROne", "ZingHR",
      "Zoho People", "sumHR", "BambooHR India", "SAP SuccessFactors",
      "Workday India", "Oracle HCM India",
      "Quess Corp", "TeamLease", "ManpowerGroup India",
      "Randstad India", "Adecco India", "Kelly Services India",
      "ABC Consultants", "Mafoi", "Antal India",
      // Companies with large HR functions
      "TCS HR", "Infosys HR", "Wipro HR",
      "HDFC Bank HR", "ICICI Bank HR",
      "Amazon India HR", "Flipkart HR",
    ],
    skills: [
      "talent acquisition", "sourcing", "boolean search",
      "linkedin recruiter", "naukri", "headhunting",
      "onboarding", "induction", "exit management",
      "performance management", "appraisals", "kras", "kpis",
      "hr policies", "hr compliance", "labour laws",
      "payroll", "compensation benchmarking", "compensation structuring",
      "workday", "successfactors", "darwinbox", "keka",
      "excel", "people analytics", "hr dashboards",
      "employee engagement", "culture building", "employer branding",
      "learning management system", "lms",
    ],
    signals: [
      "hr", "human resources", "people", "talent",
      "recruitment", "hiring", "workforce", "culture",
      "employee", "engagement", "l&d", "hrbp",
    ],
    aliases: [
      "hr", "human resources", "people operations", "people team",
      "talent management", "recruitment",
    ],
    negatives: [
      "hr freelance recruiter commission only",
      "recruitment sales telecalling",
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  "Real Estate": {
    roles: [
      "real estate analyst", "property analyst",
      "investment analyst real estate", "reit analyst",
      "valuations analyst real estate", "fund manager real estate",
      "asset manager real estate", "portfolio manager real estate",
      "project manager real estate", "construction manager real estate",
      "leasing manager", "property manager",
      "transaction manager real estate", "deal analyst real estate",
      "research analyst real estate", "market research real estate",
      "sales manager real estate", "channel partner manager",
      "real estate intern",
    ],
    companies: [
      "DLF", "Godrej Properties", "Prestige Group",
      "Oberoi Realty", "Brigade Group", "Sobha Developers",
      "Macrotech Developers", "Lodha Group",
      "Phoenix Mills", "Embassy REIT", "Mindspace REIT",
      "Brookfield India REIT", "Nexus Malls",
      "JLL India", "CBRE India", "Knight Frank India",
      "Cushman & Wakefield India", "Colliers India",
      "Savills India", "Anarock", "PropEquity",
      "NoBroker", "Housing.com", "MagicBricks", "99acres",
      "Squareyards", "PropTiger",
    ],
    skills: [
      "financial modelling real estate", "discounted cash flow",
      "argus", "excel", "powerpoint",
      "property valuation", "cap rate", "noi", "irr",
      "lease structuring", "lease analysis",
      "market research", "micro market analysis",
      "rera", "real estate regulations",
      "project management", "construction timelines",
      "gis", "autocad",
    ],
    signals: [
      "real estate", "property", "realty", "reit",
      "commercial real estate", "residential real estate",
      "leasing", "asset management real estate",
    ],
    aliases: [
      "real estate", "property", "realty", "reit",
      "cre", "commercial real estate",
    ],
    negatives: [
      "real estate agent commission", "property dealer walk-in",
      "site sales executive basic",
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  "Logistics & Supply Chain": {
    roles: [
      "supply chain analyst", "supply chain manager",
      "logistics analyst", "logistics manager",
      "procurement analyst", "procurement manager",
      "sourcing analyst", "strategic sourcing",
      "vendor development manager", "supplier quality engineer",
      "inventory manager", "demand planner", "s&op manager",
      "warehouse manager", "distribution manager",
      "last mile delivery manager", "fleet manager",
      "freight forwarding analyst", "customs analyst",
      "import export manager", "trade compliance",
      "cold chain manager", "reverse logistics manager",
      "supply chain consultant", "supply chain intern",
    ],
    companies: [
      "Delhivery", "BlueDart", "DTDC", "Ecom Express",
      "XpressBees", "Shadowfax", "Shiprocket", "Porter",
      "Rivigo", "Blackbuck", "FarEye", "LogiNext",
      "Maersk India", "DHL India", "FedEx India",
      "UPS India", "Kuehne+Nagel India", "DB Schenker India",
      "Panalpina India", "Geodis India",
      "Amazon Logistics", "Flipkart Ekart",
      "Mahindra Logistics", "TCI Group",
      "TVS Supply Chain", "Allcargo Logistics",
      "Gateway Distriparks", "Container Corporation",
      "Adani Ports", "JSW Logistics",
    ],
    skills: [
      "supply chain management", "erp", "sap mm", "sap ewm",
      "oracle scm", "manhattan associates", "jda",
      "demand forecasting", "statistical forecasting",
      "inventory optimisation", "safety stock", "reorder point",
      "warehouse management system", "wms",
      "transportation management system", "tms",
      "lean", "six sigma", "kaizen", "value stream mapping",
      "incoterms", "customs clearance", "freight forwarding",
      "supplier relationship management", "srm",
      "excel", "sql", "tableau", "power bi",
      "python", "r for supply chain analytics",
    ],
    signals: [
      "supply chain", "logistics", "procurement", "sourcing",
      "inventory", "warehouse", "fulfillment", "distribution",
      "freight", "shipping", "last mile", "cold chain",
    ],
    aliases: [
      "supply chain", "scm", "logistics", "procurement",
      "warehousing", "distribution",
    ],
    negatives: [
      "delivery boy", "courier boy", "truck driver",
      "warehouse packer", "loading unloading",
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  Other: {
    roles: [
      "analyst", "associate", "manager", "executive",
      "coordinator", "specialist", "officer", "intern",
    ],
    companies: [],
    skills: [
      "excel", "powerpoint", "communication", "teamwork",
      "problem solving", "analytical thinking",
    ],
    signals: ["hiring", "job opening", "vacancy", "opportunity"],
    aliases: ["general", "other", "miscellaneous"],
    negatives: [
      "telecaller", "bpo", "data entry", "back office",
      "door to door sales", "field sales executive unskilled",
    ],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY FUNCTIONS — used directly by serpQueryEngine.ts and sentinel.ts
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns all searchable terms for a given industry flattened into a single array.
 * Used by serpQueryEngine to build Google Jobs query strings.
 */
export function getAllKeywords(industry: IndustryName): string[] {
  const kws = INDUSTRY_KEYWORDS[industry];
  if (!kws) return [];
  return [
    ...kws.roles,
    ...kws.skills,
    ...kws.signals,
    ...kws.aliases,
  ];
}

/**
 * Returns the top company names for a given industry.
 * Used by serpQueryEngine Bucket A to build targeted company queries.
 */
export function getTopCompanies(industry: IndustryName, limit = 20): string[] {
  return (INDUSTRY_KEYWORDS[industry]?.companies ?? []).slice(0, limit);
}

/**
 * Scores a raw result string against an industry's keyword set.
 * Returns a number — higher = more relevant.
 * Used by sentinel.ts scoreResult() for ranking.
 */
export function scoreAgainstIndustry(
  text: string,
  industry: IndustryName
): number {
  const kws = INDUSTRY_KEYWORDS[industry];
  if (!kws) return 0;

  const lower = text.toLowerCase();
  let score = 0;

  // Role match — highest weight (role keywords are most specific)
  kws.roles.forEach(kw => {
    if (lower.includes(kw.toLowerCase())) score += 12;
  });

  // Company match
  kws.companies.forEach(co => {
    if (lower.includes(co.toLowerCase())) score += 10;
  });

  // Signal keywords
  kws.signals.forEach(kw => {
    if (lower.includes(kw.toLowerCase())) score += 6;
  });

  // Skills
  kws.skills.forEach(kw => {
    if (lower.includes(kw.toLowerCase())) score += 4;
  });

  // Alias match
  kws.aliases.forEach(kw => {
    if (lower.includes(kw.toLowerCase())) score += 5;
  });

  // Negative keywords — penalise heavily
  kws.negatives.forEach(kw => {
    if (lower.includes(kw.toLowerCase())) score -= 30;
  });

  return score;
}

/**
 * Returns true if the result text matches any negative keyword for the industry.
 * Used as a hard filter in sentinel.ts isJunkResult().
 */
export function isNegativeMatch(text: string, industry: IndustryName): boolean {
  const negatives = INDUSTRY_KEYWORDS[industry]?.negatives ?? [];
  const lower = text.toLowerCase();
  return negatives.some(kw => lower.includes(kw.toLowerCase()));
}

/**
 * Builds a Google Jobs query string for a given industry and role.
 * Returns the optimal query combining role + top company names.
 * Used by serpQueryEngine Bucket A query builder.
 */
export function buildBucketAQuery(
  industry: IndustryName,
  role: string,
  companiesPerQuery = 4
): string[] {
  const companies = getTopCompanies(industry, 20);
  const queries: string[] = [];

  // Split companies into groups of companiesPerQuery
  for (let i = 0; i < companies.length; i += companiesPerQuery) {
    const group = companies.slice(i, i + companiesPerQuery);
    const companyStr = group.map(c => `"${c}"`).join(" OR ");
    queries.push(`"${role}" ${companyStr}`);
  }

  return queries;
}

/**
 * Returns all role titles for an industry — used to build role-variant queries.
 */
export function getRoleVariants(industry: IndustryName): string[] {
  return INDUSTRY_KEYWORDS[industry]?.roles ?? [];
}

/**
 * Returns signal keywords for use in Bucket E (google_news) queries.
 * These are the hiring-intent and growth signals for the industry.
 */
export function getSignalKeywords(industry: IndustryName): string[] {
  return INDUSTRY_KEYWORDS[industry]?.signals ?? [];
}

/**
 * Returns industry aliases (alternate names, abbreviations) for query building
 * and matching — e.g. "mgmt consulting", "strategy consulting", "big4".
 */
export function getIndustryAliases(industry: IndustryName): string[] {
  return INDUSTRY_KEYWORDS[industry]?.aliases ?? [];
}

/**
 * Returns industry skills for query building and relevance matching.
 * Used by radar signals to find emerging companies using skill-based queries.
 */
export function getIndustrySkills(industry: IndustryName): string[] {
  return INDUSTRY_KEYWORDS[industry]?.skills ?? [];
}
