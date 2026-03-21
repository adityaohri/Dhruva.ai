import { QUERIES } from "./queries";
import { runScrape, fetchCareersPages } from "./scraper";

export async function runMonthlyJob(): Promise<void> {
  const month = new Date().getMonth(); // 0-indexed: 0=Jan, 4=May, 10=Nov

  console.log(`\n🗓 Monthly Layer 2 job — month ${month + 1}\n`);

  console.log("📄 Checking careers pages...");
  await fetchCareersPages();

  const monthlyQueries = QUERIES.filter((q) => q.cadence === "monthly");
  if (monthlyQueries.length > 0) {
    console.log(`\n📦 Monthly queries (${monthlyQueries.length})`);
    await runScrape(monthlyQueries);
  }

  if (month % 3 === 0) {
    const quarterlyQueries = QUERIES.filter((q) => q.cadence === "quarterly");
    console.log(`\n📦 Quarterly queries (${quarterlyQueries.length})`);
    await runScrape(quarterlyQueries);
  }

  if (month === 4 || month === 10) {
    const biannualQueries = QUERIES.filter((q) => q.cadence === "biannual");
    console.log(`\n📦 Biannual queries (${biannualQueries.length})`);
    await runScrape(biannualQueries);
  }

  console.log("\n✅ Monthly job complete.");
}
