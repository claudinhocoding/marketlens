"""Application settings loaded from environment variables."""

from pydantic_settings import BaseSettings
from pathlib import Path


class Settings(BaseSettings):
    # Paths
    base_dir: Path = Path(__file__).resolve().parent.parent
    data_dir: Path = base_dir / "data"
    db_path: Path = data_dir / "marketlens.db"
    chroma_dir: Path = data_dir / "chroma"

    # API
    api_host: str = "0.0.0.0"
    api_port: int = 8000

    # Claude
    anthropic_api_key: str = ""
    claude_model: str = "claude-sonnet-4-20250514"
    claude_max_tokens: int = 4096

    # Scraper
    scraper_timeout: int = 30000  # ms
    scraper_max_pages: int = 20
    scraper_headless: bool = True

    # My company (for comparisons)
    my_company_id: int | None = None

    model_config = {"env_file": ".env", "env_prefix": "ML_", "extra": "ignore"}


settings = Settings()
settings.data_dir.mkdir(parents=True, exist_ok=True)
