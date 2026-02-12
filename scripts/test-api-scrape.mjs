import { runSuite } from "./api-tests/lib.mjs";

runSuite("scrape").catch((error) => {
  console.error(`\n❌ Scrape API test failed: ${error.message}`);
  process.exitCode = 1;
});
