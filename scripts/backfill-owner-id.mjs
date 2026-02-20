import "dotenv/config";
import { init } from "@instantdb/admin";

const appId = process.env.NEXT_PUBLIC_INSTANT_APP_ID;
const adminToken = process.env.INSTANT_APP_ADMIN_TOKEN;
const legacyOwnerEmail = process.env.LEGACY_OWNER_EMAIL;

if (!appId || !adminToken) {
  console.error("Missing NEXT_PUBLIC_INSTANT_APP_ID or INSTANT_APP_ADMIN_TOKEN");
  process.exit(1);
}

if (!legacyOwnerEmail) {
  console.error("LEGACY_OWNER_EMAIL is required (no default fallback).");
  process.exit(1);
}

const db = init({ appId, adminToken });

const entities = [
  "companies",
  "features",
  "pricing_tiers",
  "marketing_intel",
  "product_intel",
  "blog_posts",
  "events",
  "collections",
  "contacts",
  "job_listings",
  "social_profiles",
  "comparisons",
  "reports",
];

function chunk(items, size) {
  const out = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

async function resolveLegacyOwnerId() {
  const refreshToken = await db.auth.createToken({ email: legacyOwnerEmail });
  const user = await db.auth.verifyToken(refreshToken);
  return user.id;
}

async function backfillEntityOwner(entity, ownerId) {
  const query = await db.query({
    [entity]: {
      $: { where: { owner_id: { $isNull: true } } },
    },
  });

  const rows = query[entity] || [];
  if (!rows.length) {
    console.log(`- ${entity}: no null owner rows`);
    return 0;
  }

  const txns = rows.map((row) => db.tx[entity][row.id].update({ owner_id: ownerId }));
  const batches = chunk(txns, 100);

  for (const batch of batches) {
    await db.transact(batch);
  }

  console.log(`- ${entity}: backfilled ${rows.length} row(s)`);
  return rows.length;
}

async function main() {
  console.log(`Resolving legacy owner from ${legacyOwnerEmail}...`);
  const ownerId = await resolveLegacyOwnerId();
  console.log(`Using owner_id=${ownerId}`);

  let total = 0;
  for (const entity of entities) {
    total += await backfillEntityOwner(entity, ownerId);
  }

  console.log(`Done. Backfilled ${total} row(s).`);
}

main().catch((err) => {
  console.error("Backfill failed", err);
  process.exit(1);
});
