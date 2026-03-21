import { QUERIES } from "./queries";
import { runScrape, fetchCareersPages } from "./scraper";

export type MonthlyJobOptions = {
  forceFullRun?: boolean;
};

export async function runMonthlyJob(options?: MonthlyJobOptions) {
  if (options?.forceFullRun) {
    console.log("\n🗓 IB Layer 2 full run (forced) — careers + all queries\n");
    console.log("📄 Checking IB careers pages...");
    await fetchCareersPages();
    console.log(`\n📦 All IB queries (${QUERIES.length})`);
    await runScrape(QUERIES);
    console.log("\n✅ IB full job complete.");
    return;
  }

  const month = new Date().getMonth();

  console.log(`\n🗓 IB Layer 2 job — month ${month + 1}\n`);

  console.log("📄 Checking IB careers pages...");
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

  console.log("\n✅ IB Layer 2 job complete.");
}
