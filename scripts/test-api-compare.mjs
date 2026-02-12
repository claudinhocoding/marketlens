import { runSuite } from "./api-tests/lib.mjs";

runSuite("compare").catch((error) => {
  console.error(`\n❌ Compare API test failed: ${error.message}`);
  process.exitCode = 1;
});
