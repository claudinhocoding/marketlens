import { i } from "@instantdb/react";

const _schema = i.schema({
  entities: {
    $files: i.entity({
      path: i.string().unique().indexed(),
      url: i.string(),
    }),
    $users: i.entity({
      email: i.string().unique().indexed().optional(),
      imageURL: i.string().optional(),
      type: i.string().optional(),
    }),
    companies: i.entity({
      name: i.string(),
      url: i.string(),
      description: i.string().optional(),
      industry: i.string().optional(),
      is_mine: i.boolean(),
      scraped_at: i.string().optional(),
      thumbnail_url: i.string().optional(),
    }),
    features: i.entity({
      name: i.string(),
      category: i.string().optional(),
      description: i.string().optional(),
    }),
    pricing_tiers: i.entity({
      name: i.string(),
      price: i.string().optional(),
      billing_period: i.string().optional(),
      features_text: i.string().optional(),
    }),
    marketing_intel: i.entity({
      value_props: i.string().optional(),
      target_personas: i.string().optional(),
      key_messages: i.string().optional(),
      differentiators: i.string().optional(),
      pain_points: i.string().optional(),
    }),
    product_intel: i.entity({
      feature_summary: i.string().optional(),
      tech_stack: i.string().optional(),
      positioning: i.string().optional(),
    }),
    blog_posts: i.entity({
      title: i.string(),
      url: i.string().optional(),
      date: i.string().optional(),
      summary: i.string().optional(),
    }),
    events: i.entity({
      name: i.string(),
      date: i.string().optional(),
      location: i.string().optional(),
      url: i.string().optional(),
    }),
    social_profiles: i.entity({
      platform: i.string(),
      followers_count: i.number().optional(),
      url: i.string(),
    }),
    comparisons: i.entity({
      type: i.string(),
      data: i.string(),
      created_at: i.string(),
    }),
    reports: i.entity({
      title: i.string(),
      type: i.string(),
      content: i.string(),
      created_at: i.string(),
    }),
  },
  links: {
    $usersLinkedPrimaryUser: {
      forward: {
        on: "$users",
        has: "one",
        label: "linkedPrimaryUser",
        onDelete: "cascade",
      },
      reverse: {
        on: "$users",
        has: "many",
        label: "linkedGuestUsers",
      },
    },
    companyFeatures: {
      forward: { on: "companies", has: "many", label: "features" },
      reverse: { on: "features", has: "one", label: "company" },
    },
    companyPricingTiers: {
      forward: { on: "companies", has: "many", label: "pricing_tiers" },
      reverse: { on: "pricing_tiers", has: "one", label: "company" },
    },
    companyMarketingIntel: {
      forward: { on: "companies", has: "many", label: "marketing_intel" },
      reverse: { on: "marketing_intel", has: "one", label: "company" },
    },
    companyProductIntel: {
      forward: { on: "companies", has: "many", label: "product_intel" },
      reverse: { on: "product_intel", has: "one", label: "company" },
    },
    companyBlogPosts: {
      forward: { on: "companies", has: "many", label: "blog_posts" },
      reverse: { on: "blog_posts", has: "one", label: "company" },
    },
    companyEvents: {
      forward: { on: "companies", has: "many", label: "events" },
      reverse: { on: "events", has: "one", label: "company" },
    },
    companySocialProfiles: {
      forward: { on: "companies", has: "many", label: "social_profiles" },
      reverse: { on: "social_profiles", has: "one", label: "company" },
    },
  },
  rooms: {},
});

type _AppSchema = typeof _schema;
interface AppSchema extends _AppSchema {}
const schema: AppSchema = _schema;

export type { AppSchema };
export default schema;
