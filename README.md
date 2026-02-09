# MarketLens — Competitive Intelligence Platform

AI-powered competitive intelligence platform built with **Next.js 15**, **InstantDB**, and **Tailwind CSS**, with Python-based scraping and Claude-powered analysis.

## Architecture

- **Frontend**: Next.js 15 (App Router) + InstantDB (real-time) + Tailwind CSS (dark mode)
- **Backend**: Next.js API routes that call Python modules via subprocess
- **AI**: Claude API for extraction, analysis, comparison, and agent chat
- **Database**: InstantDB (real-time, schema-driven)
- **Scraping**: Python (Playwright-based crawler)

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
pip install -r requirements.txt

# Copy environment variables
cp .env.example .env
# Fill in your API keys

# Push schema to InstantDB
npx tsx scripts/push-schema.ts

# Run development server
npm run dev
```

## Python Modules

The Python backend modules handle scraping and AI-powered analysis:

- `src/scraper/` — Website crawling (Playwright)
- `src/extraction/` — Claude-powered data extraction
- `src/analysis/` — Competitive comparison and targeting matrix
- `src/reports/` — Report generation
- `src/agent/` — AI agent for natural language queries
