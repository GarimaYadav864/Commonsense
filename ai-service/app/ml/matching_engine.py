
from math import radians, sin, cos, sqrt, atan2

from app.schemas.matching import (
    MatchRequest,
    MatchCandidate,
    RankedMatch,
)


def calculate_distance(lat1, lon1, lat2, lon2):
    """Calculate distance between two coordinates using Haversine formula."""

    earth_radius_km = 6371.0

    lat1, lon1, lat2, lon2 = map(
        radians, [lat1, lon1, lat2, lon2]
    )

    delta_lat = lat2 - lat1
    delta_lon = lon2 - lon1

    a = (
        sin(delta_lat / 2) ** 2
        + cos(lat1) * cos(lat2) * sin(delta_lon / 2) ** 2
    )

    return 2 * earth_radius_km * atan2(sqrt(a), sqrt(1 - a))


def get_location_score(request, candidate):
    if (
        request.latitude is not None
        and candidate.latitude is not None
    ):
        distance = calculate_distance(
            request.latitude,
            request.longitude,
            candidate.latitude,
            candidate.longitude,
        )

        # Score decreases as distance increases.
        score = max(0, 100 * (1 - distance / 50))

        return score, round(distance, 2)

    # Text-based fallback until coordinates are available.
    same_location = (
        request.location.strip().lower()
        == candidate.location.strip().lower()
    )

    return (100 if same_location else 35), None


def get_quantity_score(request, candidate):
    if candidate.quantity_available < request.quantity:
        return 0

    surplus = candidate.quantity_available - request.quantity

    # Prefer resources that can fulfil the request
    # without leaving an unnecessarily large surplus.
    surplus_ratio = surplus / request.quantity

    return max(0, 100 - (surplus_ratio * 25))


def get_condition_score(condition):
    condition_scores = {
        "new": 100,
        "good": 85,
        "fair": 65,
        "not-applicable": 80,
    }

    return condition_scores.get(condition, 50)


def get_weights(urgency):
    weights = {
        "low": {
            "location": 30,
            "quantity": 30,
            "condition": 20,
            "availability": 20,
        },
        "medium": {
            "location": 40,
            "quantity": 25,
            "condition": 15,
            "availability": 20,
        },
        "high": {
            "location": 45,
            "quantity": 25,
            "condition": 10,
            "availability": 20,
        },
        "critical": {
            "location": 50,
            "quantity": 20,
            "condition": 10,
            "availability": 20,
        },
    }

    return weights[urgency]


def rank_candidates(
    request: MatchRequest,
    candidates: list[MatchCandidate],
):
    ranked_matches = []

    weights = get_weights(request.urgency)

    for candidate in candidates:

        # Exclude unavailable resources.
        if not candidate.available:
            continue

        # Exclude category mismatches.
        if candidate.category.strip().lower() != request.category.strip().lower():
            continue

        # Exclude incompatible units.
        if candidate.unit.strip().lower() != request.unit.strip().lower():
            continue

        # Exclude insufficient quantities.
        if candidate.quantity_available < request.quantity:
            continue

        location_score, distance = get_location_score(
            request, candidate
        )

        quantity_score = get_quantity_score(
            request, candidate
        )

        condition_score = get_condition_score(
            candidate.condition
        )

        availability_score = 100

        final_score = (
            location_score * weights["location"]
            + quantity_score * weights["quantity"]
            + condition_score * weights["condition"]
            + availability_score * weights["availability"]
        ) / 100

        reasons = [
            f"Location suitability score: {location_score:.1f}",
            f"Quantity suitability score: {quantity_score:.1f}",
            f"Resource condition: {candidate.condition}",
            "Resource is currently available",
        ]

        if distance is not None:
            reasons.append(f"Approximate distance: {distance} km")

        ranked_matches.append(
            RankedMatch(
                resource_id=candidate.resource_id,
                provider_id=candidate.provider_id,
                score=round(final_score, 2),
                rank=0,
                distance_km=distance,
                reasons=reasons,
            )
        )

    ranked_matches.sort(
        key=lambda match: match.score,
        reverse=True,
    )

    for index, match in enumerate(ranked_matches):
        match.rank = index + 1

    return ranked_matches
