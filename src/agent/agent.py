"""Conversational AI agent for querying competitive intelligence data."""

import json
from sqlalchemy.orm import Session
from src.db.models import Company, SessionLocal
from src.db.vectorstore import vector_store
from src.extraction.llm import call_claude
from src.analysis.comparison import get_feature_matrix, get_marketing_comparison, identify_gaps
from src.analysis.targeting_matrix import build_targeting_matrix


SYSTEM_PROMPT = """You are MarketLens AI, a competitive intelligence assistant. You have access to structured data about companies, their products, marketing, features, and market positioning.

When answering:
- Be specific and data-driven
- Reference actual companies and features from the data
- If asked to compare, use the structured data provided
- If asked for recommendations, be actionable and strategic
- You can generate reports, simulations, and positioning recommendations

The user's query and relevant context from the knowledge base are provided below."""


class IntelligenceAgent:
    """Conversational agent backed by vector search and structured data."""

    def __init__(self):
        self.conversation_history: list[dict] = []

    def _get_context(self, query: str, db: Session) -> str:
        """Build context from vector search + structured data."""
        # Vector search
        search_results = vector_store.search(query, n_results=5)
        vector_context = "\n\n".join(
            f"[{r['metadata'].get('company_name', 'Unknown')} - {r['metadata'].get('section', '')}]\n{r['document'][:1000]}"
            for r in search_results
        )

        # Structured data summary
        companies = db.query(Company).all()
        company_summary = "Tracked companies: " + ", ".join(
            f"{c.name} ({'YOUR COMPANY' if c.is_mine else 'competitor'})" for c in companies
        )

        return f"""{company_summary}

--- Relevant Knowledge Base Results ---
{vector_context}"""

    def query(self, user_query: str, db: Session | None = None) -> str:
        """Process a user query and return a response."""
        close_db = False
        if db is None:
            db = SessionLocal()
            close_db = True

        try:
            context = self._get_context(user_query, db)

            # Check for special commands
            lower = user_query.lower()
            extra_data = ""

            if "feature" in lower and ("compar" in lower or "matrix" in lower):
                matrix = get_feature_matrix(db)
                extra_data = f"\n\nFeature Matrix Data:\n{json.dumps(matrix, indent=2)[:3000]}"

            elif "marketing" in lower and "compar" in lower:
                mkt = get_marketing_comparison(db)
                extra_data = f"\n\nMarketing Comparison:\n{json.dumps(mkt, indent=2)[:3000]}"

            elif "gap" in lower or "whitespace" in lower:
                my = db.query(Company).filter(Company.is_mine == True).first()
                if my:
                    gaps = identify_gaps(db, my.id)
                    extra_data = f"\n\nGap Analysis:\n{json.dumps(gaps, indent=2)[:3000]}"

            elif "target" in lower and ("matrix" in lower or "heatmap" in lower):
                targeting = build_targeting_matrix(db)
                extra_data = f"\n\nTargeting Matrix:\n{json.dumps(targeting, indent=2)[:3000]}"

            prompt = f"""Context:
{context}{extra_data}

Conversation history:
{self._format_history()}

User query: {user_query}

Provide a helpful, data-driven response."""

            response = call_claude(SYSTEM_PROMPT, prompt, max_tokens=3000)

            # Update history
            self.conversation_history.append({"role": "user", "content": user_query})
            self.conversation_history.append({"role": "assistant", "content": response})
            # Keep last 10 exchanges
            if len(self.conversation_history) > 20:
                self.conversation_history = self.conversation_history[-20:]

            return response
        finally:
            if close_db:
                db.close()

    def _format_history(self) -> str:
        if not self.conversation_history:
            return "(No prior conversation)"
        lines = []
        for msg in self.conversation_history[-6:]:
            role = "User" if msg["role"] == "user" else "Assistant"
            lines.append(f"{role}: {msg['content'][:200]}")
        return "\n".join(lines)

    def reset(self):
        self.conversation_history = []


# Singleton
agent = IntelligenceAgent()
