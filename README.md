# MarketLens — Competitive Intelligence Platform

AI-powered competitive intelligence platform built with **Next.js 15**, **InstantDB**, and **Tailwind CSS**, with TypeScript-based scraping and Claude-powered analysis.

## Architecture

- **Frontend**: Next.js 15 (App Router) + InstantDB (real-time) + Tailwind CSS (dark mode)
- **Backend**: Next.js API routes + TypeScript service modules in `src/lib`
- **AI**: Claude API for extraction, analysis, comparison, and agent chat
- **Database**: InstantDB (real-time, schema-driven)
- **Scraping**: TypeScript + Cheerio-based website crawler

## Pages

| Route | Description |
|---|---|
| `/` | Dashboard — tracked companies, quick stats |
| `/companies/[id]` | Company detail — features, pricing, marketing intel, product intel |
| `/compare` | Feature matrix, marketing heatmap, saved comparisons |
| `/reports` | AI-generated reports (competitive assessment, gap analysis, positioning) |
| `/agent` | Chat interface for the AI competitive intelligence agent |

## API Routes

| Endpoint | Method | Description |
|---|---|---|
| `/api/scrape` | POST | Scrape a company website |
| `/api/extract` | POST | Run Claude extraction on scraped data |
| `/api/compare` | POST | Run competitive comparison analysis |
| `/api/report` | POST | Generate an intelligence report |
| `/api/chat` | POST | Chat with the AI agent |

## Data Model (InstantDB)

- **companies** — name, url, description, industry, is_mine, scraped_at
- **features** — name, category, description (linked to company)
- **pricing_tiers** — name, price, billing_period, features_text (linked to company)
- **marketing_intel** — value_props, target_personas, key_messages, differentiators, pain_points (linked to company)
- **product_intel** — feature_summary, tech_stack, positioning (linked to company)
- **blog_posts** — title, url, date, summary (linked to company)
- **events** — name, date, location, url (linked to company)
- **comparisons** — type, data (JSON), created_at
- **reports** — title, type, content (markdown), created_at

## Setup

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
# Fill in your API keys

# Push schema to InstantDB
npx tsx scripts/push-schema.ts

# Run development server
npm run dev
```

## API Smoke Tests

These scripts validate backend/API behavior (not UI rendering) by calling each route and checking response shapes.

```bash
# Run all API smoke tests
npm run test:api

# Run individual endpoint suites
npm run test:api:scrape
npm run test:api:extract
npm run test:api:compare
npm run test:api:report
npm run test:api:chat
```

Optional environment overrides:

- `API_BASE_URL` (default: `http://localhost:4001`)
- `API_TEST_URL` (default: `https://example.com`)
- `API_TEST_COMPANY_ID` (reuse an existing company for extract/report tests)
- `API_TEST_TIMEOUT_MS` (default: `240000`)
- `API_TEST_CHAT_MESSAGE` (custom prompt for chat test)
- `MARKETLENS_SCRAPE_BUDGET_MS` (default: `90000`, max wall-clock crawl budget)

## TypeScript Modules

The TypeScript backend modules handle scraping and AI-powered analysis:

- `src/lib/scraper.ts` — Website crawling and metadata extraction
- `src/lib/extraction.ts` — Claude-powered structured data extraction
- `src/lib/analysis.ts` — Competitive comparison and targeting analysis
- `src/lib/reports.ts` — Report and assessment generation
- `src/lib/agent.ts` — AI agent query handling
