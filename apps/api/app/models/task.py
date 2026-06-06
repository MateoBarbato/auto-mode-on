"""Pydantic models for strict task extraction output."""

from typing import Literal

from pydantic import BaseModel, Field


class ExtractedTask(BaseModel):
    intent: Literal["task_creation"]
    owner: str
    task_title: str
    description: str | None = None
    due_date: str | None = None
    status: Literal["pending"]
    priority: Literal["low", "normal", "high", "urgent"]
    confidence: float = Field(ge=0, le=1)
