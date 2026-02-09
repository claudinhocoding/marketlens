# MarketLens

**Competitive Intelligence Platform** — Scrape competitor websites, extract product and marketing intelligence using AI, compare features, identify market gaps, and generate strategic reports.

## Features

- **Competitor Scraping** — Crawl any website with Playwright, extract company info, blog posts, events, features, and pricing
- **Product Intelligence** — AI-powered extraction of feature lists, tech stack clues, and product positioning
- **Marketing Intelligence** — Extract value propositions, target personas, key messages, differentiators, and pain points
- **Competitive Comparison** — Feature matrix, marketing comparison, persona overlap analysis, gap identification
- **Market Targeting Matrix** — Heatmap of which competitors target which verticals, with whitespace opportunity detection
- **Assessment Reports** — AI-generated executive summaries and detailed markdown reports with actionable recommendations
- **AI Agent** — Conversational interface to query all intelligence data, backed by ChromaDB vector search
- **Events Calendar** — Track competitor conferences, webinars, and events

## Tech Stack

- **Backend:** Python + FastAPI
- **Storage:** SQLite (structured data) + ChromaDB (vector search)
- **Scraping:** Playwright (headless browser)
- **AI:** Anthropic Claude API (extraction + analysis + agent)
- **CLI:** Click + Rich

## Quick Start

```bash
# Clone and install
git clone https://github.com/claudinhocoding/marketlens.git
cd marketlens
pip install -r requirements.txt
playwright install chromium

# Configure
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY

# Run the API server
make run
# → http://localhost:8000/docs for Swagger UI
```

## CLI Usage

```bash
# Scrape a competitor
python scripts/cli.py scrape https://competitor.com

# Scrape your own company
python scripts/cli.py scrape https://mycompany.com --mine

# List tracked companies
python scripts/cli.py list

# Set your company for comparisons
python scripts/cli.py set-mine 1

# Feature comparison matrix
python scripts/cli.py compare

# Gap analysis
python scripts/cli.py gaps

# Market targeting matrix
python scripts/cli.py targeting

# Generate full assessment report
python scripts/cli.py report

# View all competitor events
python scripts/cli.py events

# Interactive AI chat
python scripts/cli.py chat
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/scrape` | Scrape a website and extract all intelligence |
| `GET` | `/api/companies` | List all tracked companies |
| `GET` | `/api/companies/{id}` | Get company details |
| `DELETE` | `/api/companies/{id}` | Remove a company |
| `POST` | `/api/companies/{id}/set-mine` | Designate as your company |
| `GET` | `/api/companies/{id}/product-intelligence` | Product intel |
| `GET` | `/api/companies/{id}/marketing-intelligence` | Marketing intel |
| `GET` | `/api/companies/{id}/pricing` | Pricing tiers |
| `GET` | `/api/companies/{id}/events` | Company events |
| `GET` | `/api/events` | All events calendar |
| `POST` | `/api/analysis/feature-matrix` | Feature comparison matrix |
| `POST` | `/api/analysis/marketing-comparison` | Marketing comparison |
| `POST` | `/api/analysis/persona-overlap` | Persona overlap analysis |
| `POST` | `/api/analysis/gaps` | Gap/whitespace analysis |
| `POST` | `/api/analysis/targeting-matrix` | Market targeting heatmap |
| `POST` | `/api/reports/executive-summary` | AI executive summary |
| `POST` | `/api/reports/full` | Full assessment report |
| `POST` | `/api/agent/query` | Query the AI agent |
| `POST` | `/api/agent/reset` | Reset agent conversation |
| `GET` | `/api/search?q=...` | Semantic search across all data |

## Example: Scrape via API

```bash
curl -X POST http://localhost:8000/api/scrape \
  -H "Content-Type: application/json" \
  -d '{"url": "https://competitor.com", "max_pages": 15, "is_mine": false}'
```

## Example: Ask the AI Agent

```bash
curl -X POST http://localhost:8000/api/agent/query \
  -H "Content-Type: application/json" \
  -d '{"query": "What features do our competitors have that we are missing?"}'
```

## Project Structure

```
marketlens/
├── src/
│   ├── api/          # FastAPI routes and schemas
│   ├── scraper/      # Playwright web crawler
│   ├── extraction/   # Claude-powered intelligence extraction
│   ├── analysis/     # Comparison, targeting matrix, gap analysis
│   ├── agent/        # Conversational AI agent
│   ├── db/           # SQLAlchemy models + ChromaDB vector store
│   └── reports/      # Report generation
├── config/           # Settings and configuration
├── scripts/          # CLI entry point
├── tests/            # Test suite
├── requirements.txt
├── Makefile
└── README.md
```

## Running Tests

```bash
make test
```

## License

MIT
