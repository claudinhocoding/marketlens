"""SQLAlchemy models for MarketLens."""

from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Text, Float, Boolean, DateTime, ForeignKey, JSON,
    create_engine,
)
from sqlalchemy.orm import declarative_base, relationship, sessionmaker
from config import settings

Base = declarative_base()


class Company(Base):
    __tablename__ = "companies"

    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    url = Column(String(512), unique=True, nullable=False)
    description = Column(Text, default="")
    logo_url = Column(String(512), default="")
    industry = Column(String(255), default="")
    is_mine = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # JSON blobs for flexible storage
    socials = Column(JSON, default=dict)       # {"twitter": "...", "linkedin": "..."}
    contact_info = Column(JSON, default=dict)  # {"email": "...", "phone": "..."}
    meta = Column(JSON, default=dict)

    # Relationships
    pages = relationship("ScrapedPage", back_populates="company", cascade="all,delete-orphan")
    features = relationship("Feature", back_populates="company", cascade="all,delete-orphan")
    pricing_tiers = relationship("PricingTier", back_populates="company", cascade="all,delete-orphan")
    blog_posts = relationship("BlogPost", back_populates="company", cascade="all,delete-orphan")
    events = relationship("Event", back_populates="company", cascade="all,delete-orphan")
    product_intel = relationship("ProductIntelligence", back_populates="company", uselist=False, cascade="all,delete-orphan")
    marketing_intel = relationship("MarketingIntelligence", back_populates="company", uselist=False, cascade="all,delete-orphan")


class ScrapedPage(Base):
    __tablename__ = "scraped_pages"

    id = Column(Integer, primary_key=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    url = Column(String(512), nullable=False)
    title = Column(String(512), default="")
    content = Column(Text, default="")
    page_type = Column(String(50), default="general")  # home, pricing, blog, about, features, events
    scraped_at = Column(DateTime, default=datetime.utcnow)

    company = relationship("Company", back_populates="pages")


class Feature(Base):
    __tablename__ = "features"

    id = Column(Integer, primary_key=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    name = Column(String(255), nullable=False)
    category = Column(String(255), default="General")
    description = Column(Text, default="")
    is_highlighted = Column(Boolean, default=False)

    company = relationship("Company", back_populates="features")


class PricingTier(Base):
    __tablename__ = "pricing_tiers"

    id = Column(Integer, primary_key=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    name = Column(String(255), nullable=False)
    price = Column(String(100), default="")
    billing_period = Column(String(50), default="monthly")
    features = Column(JSON, default=list)  # list of feature strings
    is_popular = Column(Boolean, default=False)
    meta = Column(JSON, default=dict)

    company = relationship("Company", back_populates="pricing_tiers")


class BlogPost(Base):
    __tablename__ = "blog_posts"

    id = Column(Integer, primary_key=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    title = Column(String(512), nullable=False)
    url = Column(String(512), default="")
    summary = Column(Text, default="")
    published_at = Column(DateTime, nullable=True)
    tags = Column(JSON, default=list)

    company = relationship("Company", back_populates="blog_posts")


class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    name = Column(String(512), nullable=False)
    url = Column(String(512), default="")
    description = Column(Text, default="")
    event_date = Column(DateTime, nullable=True)
    location = Column(String(255), default="")
    event_type = Column(String(100), default="conference")  # conference, webinar, meetup

    company = relationship("Company", back_populates="events")


class ProductIntelligence(Base):
    __tablename__ = "product_intelligence"

    id = Column(Integer, primary_key=True)
    company_id = Column(Integer, ForeignKey("companies.id"), unique=True, nullable=False)
    features_by_category = Column(JSON, default=dict)  # {"cat": ["feat1", ...]}
    tech_stack_clues = Column(JSON, default=list)
    product_positioning = Column(Text, default="")
    target_market = Column(Text, default="")
    analyzed_at = Column(DateTime, default=datetime.utcnow)

    company = relationship("Company", back_populates="product_intel")


class MarketingIntelligence(Base):
    __tablename__ = "marketing_intelligence"

    id = Column(Integer, primary_key=True)
    company_id = Column(Integer, ForeignKey("companies.id"), unique=True, nullable=False)
    value_propositions = Column(JSON, default=list)
    target_personas = Column(JSON, default=list)   # [{"name": "...", "description": "..."}]
    key_messages = Column(JSON, default=list)
    differentiators = Column(JSON, default=list)
    pain_points = Column(JSON, default=list)
    tone = Column(String(100), default="")
    analyzed_at = Column(DateTime, default=datetime.utcnow)

    company = relationship("Company", back_populates="marketing_intel")


# Engine / Session
engine = create_engine(f"sqlite:///{settings.db_path}", echo=False)
SessionLocal = sessionmaker(bind=engine)


def init_db():
    Base.metadata.create_all(engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
