import { runSuite } from "./api-tests/lib.mjs";

runSuite("extract").catch((error) => {
  console.error(`\n❌ Extract API test failed: ${error.message}`);
  process.exitCode = 1;
});
