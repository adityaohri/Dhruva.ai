const SCRAPINGDOG_API_KEY = process.env.SCRAPINGDOG_API_KEY;

const SCRAPINGDOG_SCRAPE_ENDPOINT = "https://api.scrapingdog.com/scrape";
const SCRAPINGDOG_LINKEDIN_ENDPOINT = "https://api.scrapingdog.com/linkedin";

function ensureApiKey(): string {
  if (!SCRAPINGDOG_API_KEY) {
    throw new Error("SCRAPINGDOG_API_KEY is not configured.");
  }
  return SCRAPINGDOG_API_KEY;
}

function isLinkedInUrl(rawUrl: string): boolean {
  try {
    const host = new URL(rawUrl).hostname.toLowerCase();
    return host === "linkedin.com" || host.endsWith(".linkedin.com");
  } catch {
    return false;
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch raw HTML for a job posting URL via Scrapingdog.
 *
 * - LinkedIn: uses the dedicated /linkedin endpoint and polls when a 202 is returned.
 * - Other domains (Workday, Greenhouse, Lever, etc.): uses /scrape with dynamic=true
 *   to render JavaScript-heavy pages.
 */
export async function fetchJobHtml(url: string): Promise<string> {
  const apiKey = ensureApiKey();

  if (isLinkedInUrl(url)) {
    // LinkedIn flow with polling for 202 "still scraping" status.
    const params = new URLSearchParams({
      api_key: apiKey,
      url,
    });

    const endpoint = `${SCRAPINGDOG_LINKEDIN_ENDPOINT}/?${params.toString()}`;
    const maxAttempts = 3;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const resp = await fetch(endpoint, { cache: "no-store" });

      if (resp.status === 200) {
        return await resp.text();
      }

      if (resp.status === 202 && attempt < maxAttempts) {
        // ScrapingDog is still scraping this LinkedIn page in the background.
        await sleep(10_000);
        continue;
      }

      const body = await resp.text().catch(() => "");
      throw new Error(
        `Scrapingdog LinkedIn fetch failed with ${resp.status}${
          body ? `: ${body.slice(0, 300)}` : ""
        }`
      );
    }

    throw new Error("Scrapingdog LinkedIn polling exceeded max attempts.");
  }

  // Generic JS-heavy job sites (Greenhouse, Workday, Lever, etc.)
  const params = new URLSearchParams({
    api_key: apiKey,
    url,
    dynamic: "true",
  });

  const scrapeUrl = `${SCRAPINGDOG_SCRAPE_ENDPOINT}?${params.toString()}`;
  const resp = await fetch(scrapeUrl, { cache: "no-store" });

  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    throw new Error(
      `Scrapingdog scrape failed with ${resp.status}${
        body ? `: ${body.slice(0, 300)}` : ""
      }`
    );
  }

  return await resp.text();
}

