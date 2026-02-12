import { runAllSuites } from "./api-tests/lib.mjs";

runAllSuites().catch((error) => {
  console.error(`\n❌ API smoke tests failed: ${error.message}`);
  process.exitCode = 1;
});
