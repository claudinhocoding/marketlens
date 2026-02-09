"""Tests for database models."""

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from src.db.models import Base, Company, Feature, PricingTier, ProductIntelligence, MarketingIntelligence


@pytest.fixture
def db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()


def test_create_company(db):
    c = Company(name="TestCo", url="https://test.com", description="A test company")
    db.add(c)
    db.commit()
    assert c.id is not None
    assert c.name == "TestCo"


def test_company_features(db):
    c = Company(name="TestCo", url="https://test.com")
    db.add(c)
    db.flush()
    f = Feature(company_id=c.id, name="SSO", category="Security")
    db.add(f)
    db.commit()
    assert len(c.features) == 1
    assert c.features[0].category == "Security"


def test_pricing_tiers(db):
    c = Company(name="TestCo", url="https://test.com")
    db.add(c)
    db.flush()
    t = PricingTier(company_id=c.id, name="Pro", price="$29/mo", features=["Feature A", "Feature B"])
    db.add(t)
    db.commit()
    assert c.pricing_tiers[0].price == "$29/mo"
    assert len(c.pricing_tiers[0].features) == 2


def test_product_intelligence(db):
    c = Company(name="TestCo", url="https://test.com")
    db.add(c)
    db.flush()
    pi = ProductIntelligence(
        company_id=c.id,
        features_by_category={"Core": ["API", "Dashboard"]},
        tech_stack_clues=["React", "Python"],
        product_positioning="Developer-first platform",
    )
    db.add(pi)
    db.commit()
    assert c.product_intel.features_by_category["Core"] == ["API", "Dashboard"]


def test_marketing_intelligence(db):
    c = Company(name="TestCo", url="https://test.com")
    db.add(c)
    db.flush()
    mi = MarketingIntelligence(
        company_id=c.id,
        value_propositions=["Fast", "Reliable"],
        target_personas=[{"name": "CTO", "verticals": ["SaaS"]}],
        differentiators=["AI-powered"],
    )
    db.add(mi)
    db.commit()
    assert len(c.marketing_intel.value_propositions) == 2


def test_is_mine_flag(db):
    c1 = Company(name="Mine", url="https://mine.com", is_mine=True)
    c2 = Company(name="Them", url="https://them.com", is_mine=False)
    db.add_all([c1, c2])
    db.commit()
    mine = db.query(Company).filter(Company.is_mine == True).first()
    assert mine.name == "Mine"
