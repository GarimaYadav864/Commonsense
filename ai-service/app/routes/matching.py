
from fastapi import APIRouter

from app.schemas.matching import (
    MatchingInput,
    MatchingResponse,
)

from app.ml.matching_engine import rank_candidates

router = APIRouter(prefix="/api/matching", tags=["Matching"])


@router.post("/rank", response_model=MatchingResponse)
def rank_resources(data: MatchingInput):

    matches = rank_candidates(
        data.request,
        data.candidates,
    )

    return MatchingResponse(
        success=True,
        request_id=data.request.request_id,
        total_matches=len(matches),
        matches=matches,
        message=(
            "Matching resources ranked successfully"
            if matches
            else "No eligible matching resources found"
        ),
    )
