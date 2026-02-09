"""Tests for comparison analysis."""

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from src.db.models import Base, Company, Feature, MarketingIntelligence
from src.analysis.comparison import get_feature_matrix, get_persona_overlap, identify_gaps


@pytest.fixture
def db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()

    # Set up test data
    c1 = Company(name="MyCompany", url="https://my.com", is_mine=True)
    c2 = Company(name="Competitor", url="https://comp.com")
    session.add_all([c1, c2])
    session.flush()

    # Features
    session.add_all([
        Feature(company_id=c1.id, name="SSO", category="Security"),
        Feature(company_id=c1.id, name="API", category="Core"),
        Feature(company_id=c2.id, name="SSO", category="Security"),
        Feature(company_id=c2.id, name="RBAC", category="Security"),
        Feature(company_id=c2.id, name="Webhooks", category="Core"),
    ])

    # Marketing
    session.add(MarketingIntelligence(
        company_id=c1.id,
        target_personas=[{"name": "CTO", "verticals": ["SaaS", "Healthcare"]}],
        differentiators=["Fast setup"],
    ))
    session.add(MarketingIntelligence(
        company_id=c2.id,
        target_personas=[{"name": "VP Eng", "verticals": ["SaaS", "Finance"]}],
        differentiators=["Enterprise grade"],
    ))

    session.commit()
    yield session
    session.close()


def test_feature_matrix(db):
    matrix = get_feature_matrix(db)
    assert "MyCompany" in matrix["companies"]
    assert "Security" in matrix["categories"]
    assert matrix["categories"]["Security"]["SSO"]["MyCompany"] is True
    assert matrix["categories"]["Security"]["SSO"]["Competitor"] is True
    assert matrix["categories"]["Security"]["RBAC"]["MyCompany"] is False


def test_persona_overlap(db):
    overlap = get_persona_overlap(db)
    # Both target SaaS
    assert "SaaS" in overlap["overlap_matrix"]["MyCompany"]["Competitor"]
    # Only MyCompany targets Healthcare
    assert "Healthcare" in overlap["unique_personas"]["MyCompany"]


def test_identify_gaps(db):
    my = db.query(Company).filter(Company.is_mine == True).first()
    gaps = identify_gaps(db, my.id)
    # RBAC and Webhooks are missing
    missing_flat = []
    for feats in gaps["missing_features"].values():
        missing_flat.extend(feats)
    assert "rbac" in missing_flat
    assert "webhooks" in missing_flat
    # API is unique to us
    unique_flat = []
    for feats in gaps["unique_features"].values():
        unique_flat.extend(f.lower() for f in feats)
    assert "api" in unique_flat
