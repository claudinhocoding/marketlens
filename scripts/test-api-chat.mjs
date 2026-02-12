import { runSuite } from "./api-tests/lib.mjs";

runSuite("chat").catch((error) => {
  console.error(`\n❌ Chat API test failed: ${error.message}`);
  process.exitCode = 1;
});
