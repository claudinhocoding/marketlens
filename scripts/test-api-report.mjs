import { runSuite } from "./api-tests/lib.mjs";

runSuite("report").catch((error) => {
  console.error(`\n❌ Report API test failed: ${error.message}`);
  process.exitCode = 1;
});
