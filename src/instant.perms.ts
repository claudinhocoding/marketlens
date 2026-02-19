// Docs: https://www.instantdb.com/docs/permissions

import type { InstantRules } from "@instantdb/react";

const canViewOwned = "auth.id != null && data.owner_id == auth.id";
const canCreateOwned = "auth.id != null && newData.owner_id == auth.id";
const canUpdateOwned = "auth.id != null && data.owner_id == auth.id && newData.owner_id == auth.id";
const canDeleteOwned = "auth.id != null && data.owner_id == auth.id";

const ownedEntityRules = {
  allow: {
    view: canViewOwned,
    create: canCreateOwned,
    update: canUpdateOwned,
    delete: canDeleteOwned,
  },
};

const rules = {
  $users: {
    allow: {
      view: "auth.id == data.id",
      update: "auth.id == data.id",
    },
  },
  $files: {
    allow: {
      view: "false",
      create: "false",
      update: "false",
      delete: "false",
    },
  },
  companies: ownedEntityRules,
  features: ownedEntityRules,
  pricing_tiers: ownedEntityRules,
  marketing_intel: ownedEntityRules,
  product_intel: ownedEntityRules,
  blog_posts: ownedEntityRules,
  events: ownedEntityRules,
  collections: ownedEntityRules,
  contacts: ownedEntityRules,
  job_listings: ownedEntityRules,
  social_profiles: ownedEntityRules,
  comparisons: ownedEntityRules,
  reports: ownedEntityRules,
} satisfies InstantRules;

export default rules;
