"""Market targeting matrix — heatmap of competitors vs verticals/segments."""

from sqlalchemy.orm import Session
from src.db.models import Company, MarketingIntelligence


def build_targeting_matrix(db: Session, company_ids: list[int] | None = None) -> dict:
    """Build a targeting matrix: companies × verticals.

    Returns:
        {
            "companies": ["Company A", ...],
            "verticals": ["Healthcare", "Finance", ...],
            "matrix": {
                "Company A": {"Healthcare": 2, "Finance": 0},  # count of personas targeting
            },
            "whitespace": ["Verticals with low total coverage"]
        }
    """
    query = db.query(Company)
    if company_ids:
        query = query.filter(Company.id.in_(company_ids))
    companies = query.all()

    # Collect all verticals and per-company targeting strength
    all_verticals: set[str] = set()
    company_targeting: dict[str, dict[str, int]] = {}

    for company in companies:
        mi = company.marketing_intel
        targeting: dict[str, int] = {}
        if mi and mi.target_personas:
            for persona in mi.target_personas:
                if isinstance(persona, dict):
                    for v in persona.get("verticals", []):
                        v_norm = v.strip().title()
                        all_verticals.add(v_norm)
                        targeting[v_norm] = targeting.get(v_norm, 0) + 1
        company_targeting[company.name] = targeting

    verticals = sorted(all_verticals)
    company_names = [c.name for c in companies]

    # Build matrix
    matrix = {}
    for name in company_names:
        matrix[name] = {v: company_targeting.get(name, {}).get(v, 0) for v in verticals}

    # Whitespace: verticals where total targeting across all companies is ≤ 1
    vertical_totals = {v: sum(matrix[c].get(v, 0) for c in company_names) for v in verticals}
    whitespace = [v for v, total in vertical_totals.items() if total <= 1]

    return {
        "companies": company_names,
        "verticals": verticals,
        "matrix": matrix,
        "whitespace": whitespace,
    }


def format_matrix_text(matrix_data: dict) -> str:
    """Format targeting matrix as readable text table."""
    companies = matrix_data["companies"]
    verticals = matrix_data["verticals"]
    matrix = matrix_data["matrix"]

    if not verticals or not companies:
        return "No targeting data available."

    # Column widths
    vert_width = max(len(v) for v in verticals) + 2
    col_width = max(max((len(c) for c in companies), default=8), 8) + 2

    # Header
    header = "Vertical".ljust(vert_width) + "".join(c.ljust(col_width) for c in companies)
    sep = "-" * len(header)

    rows = [header, sep]
    for v in verticals:
        row = v.ljust(vert_width)
        for c in companies:
            score = matrix[c].get(v, 0)
            indicator = "███" if score >= 2 else "██░" if score == 1 else "░░░"
            row += f"{indicator} ({score})".ljust(col_width)
        rows.append(row)

    rows.append(sep)
    if matrix_data["whitespace"]:
        rows.append(f"\nWhitespace opportunities: {', '.join(matrix_data['whitespace'])}")

    return "\n".join(rows)
