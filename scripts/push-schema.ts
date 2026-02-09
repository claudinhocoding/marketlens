import { init } from "@instantdb/admin";
import schema from "../src/instant.schema";

const APP_ID = process.env.NEXT_PUBLIC_INSTANT_APP_ID!;
const ADMIN_TOKEN = process.env.INSTANT_APP_ADMIN_TOKEN!;

if (!APP_ID || !ADMIN_TOKEN) {
  console.error("Missing NEXT_PUBLIC_INSTANT_APP_ID or INSTANT_APP_ADMIN_TOKEN in .env");
  process.exit(1);
}

const adminDb = init({ appId: APP_ID, adminToken: ADMIN_TOKEN, schema });

async function pushSchema() {
  try {
    console.log("Pushing schema to InstantDB...");
    // The admin SDK applies the schema on init. 
    // We can verify by doing a simple query.
    const result = await adminDb.query({ companies: {} });
    console.log("Schema pushed successfully!");
    console.log(`Found ${result.companies?.length ?? 0} existing companies.`);
  } catch (err) {
    console.error("Error pushing schema:", err);
    process.exit(1);
  }
}

pushSchema();
