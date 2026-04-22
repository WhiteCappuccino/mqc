from datetime import datetime, timezone
from enum import Enum
from fastapi import FastAPI
from pydantic import BaseModel, Field


class Recommendation(str, Enum):
    approved = "approved"
    manual_review = "manual_review"
    reject = "reject"


class AnalyzeRequest(BaseModel):
    mediaType: str
    title: str = Field(min_length=2, max_length=120)
    description: str | None = Field(default=None, max_length=500)
    mimeType: str
    sizeBytes: int = Field(gt=0)


class AnalyzeResponse(BaseModel):
    score: float
    violations: list[str]
    recommendation: Recommendation
    details: dict[str, str | int | float]


app = FastAPI(title="Media Analyzer Service", version="1.0.0")


@app.get("/health")
def health() -> dict[str, str]:
    return {"ok": "true", "service": "analyzer", "timestamp": _timestamp()}


@app.post("/analyze", response_model=AnalyzeResponse)
def analyze(payload: AnalyzeRequest) -> AnalyzeResponse:
    violations: list[str] = []
    score = 1.0

    if payload.sizeBytes > 50 * 1024 * 1024:
        violations.append("large_file")
        score -= 0.2
    if payload.sizeBytes < 1024:
        violations.append("suspiciously_small_file")
        score -= 0.35
    if not payload.description or len(payload.description.strip()) < 10:
        violations.append("missing_metadata_description")
        score -= 0.15
    if payload.mediaType == "TEXT" and "charset" not in payload.mimeType:
        violations.append("text_without_charset")
        score -= 0.1

    score = max(0.0, min(1.0, round(score, 3)))

    if score >= 0.85 and not violations:
        recommendation = Recommendation.approved
    elif score >= 0.6:
        recommendation = Recommendation.manual_review
    else:
        recommendation = Recommendation.reject

    return AnalyzeResponse(
        score=score,
        violations=violations,
        recommendation=recommendation,
        details={
            "mediaType": payload.mediaType,
            "mimeType": payload.mimeType,
            "sizeBytes": payload.sizeBytes,
            "evaluatedAt": _timestamp(),
        },
    )


def _timestamp() -> str:
    return datetime.now(timezone.utc).isoformat()
