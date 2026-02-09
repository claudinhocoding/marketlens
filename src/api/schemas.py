"""Pydantic schemas for API request/response models."""

from pydantic import BaseModel, HttpUrl
from datetime import datetime


class ScrapeRequest(BaseModel):
    url: str
    max_pages: int = 15
    is_mine: bool = False


class CompanyResponse(BaseModel):
    id: int
    name: str
    url: str
    description: str
    industry: str
    is_mine: bool
    socials: dict
    contact_info: dict
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


class AgentQuery(BaseModel):
    query: str


class AgentResponse(BaseModel):
    response: str


class ComparisonRequest(BaseModel):
    company_ids: list[int] | None = None


class ReportRequest(BaseModel):
    my_company_id: int
