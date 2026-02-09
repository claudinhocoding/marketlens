.PHONY: install run test scrape lint clean

install:
	pip install -r requirements.txt
	playwright install chromium

run:
	uvicorn src.api.app:app --host 0.0.0.0 --port 8000 --reload

test:
	pytest tests/ -v

scrape:
	@echo "Usage: python scripts/cli.py scrape <URL> [--mine] [--max-pages N]"

cli:
	python scripts/cli.py $(ARGS)

lint:
	ruff check src/ tests/

clean:
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	rm -rf data/ .pytest_cache/
