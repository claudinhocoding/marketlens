import { init } from "@instantdb/admin";
import schema from "../instant.schema";

export function getAdminDb() {
  return init({
    appId: process.env.NEXT_PUBLIC_INSTANT_APP_ID!,
    adminToken: process.env.INSTANT_APP_ADMIN_TOKEN!,
    schema,
  });
}
