
from typing import Literal
from pydantic import BaseModel, Field, model_validator


class MatchRequest(BaseModel):
    request_id: str
    category: str = Field(min_length=1)
    quantity: float = Field(gt=0)
    unit: str = Field(min_length=1)
    urgency: Literal["low", "medium", "high", "critical"] = "medium"
    location: str = Field(min_length=1)
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)

    @model_validator(mode="after")
    def validate_coordinates(self):
        if (self.latitude is None) != (self.longitude is None):
            raise ValueError("Latitude and longitude must be provided together")
        return self


class MatchCandidate(BaseModel):
    resource_id: str
    provider_id: str
    category: str
    quantity_available: float = Field(ge=0)
    unit: str
    location: str
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    available: bool = True
    condition: Literal["new", "good", "fair", "not-applicable"] = "good"

    @model_validator(mode="after")
    def validate_coordinates(self):
        if (self.latitude is None) != (self.longitude is None):
            raise ValueError("Latitude and longitude must be provided together")
        return self


class MatchingInput(BaseModel):
    request: MatchRequest
    candidates: list[MatchCandidate]


class RankedMatch(BaseModel):
    resource_id: str
    provider_id: str
    score: float
    rank: int
    distance_km: float | None
    reasons: list[str]


class MatchingResponse(BaseModel):
    success: bool
    request_id: str
    total_matches: int
    matches: list[RankedMatch]
    message: str
