import re
from math import radians, sin, cos, sqrt, atan2

from app.schemas.matching import (
    MatchRequest,
    MatchCandidate,
    RankedMatch,
)


# Only aliases with the same physical meaning are normalized together.
UNIT_ALIASES = {
    "bag": "bag", "bags": "bag",
    "piece": "piece", "pieces": "piece", "pc": "piece", "pcs": "piece",
    "packet": "packet", "packets": "packet", "pack": "packet", "packs": "packet",
    "box": "box", "boxes": "box",
    "set": "set", "sets": "set",
    "kg": "kg", "kilogram": "kg", "kilograms": "kg",
    "g": "g", "gram": "g", "grams": "g",
    "l": "litre", "liter": "litre", "liters": "litre",
    "litre": "litre", "litres": "litre",
    "ml": "ml", "millilitre": "ml", "millilitres": "ml",
}

# A small, explicit synonym map helps equivalent item wording overlap.
TOKEN_GROUPS = {
    "water": {"water", "drinking", "bottled", "beverage", "beverages"},
    "rice": {"rice"},
    "food": {"food", "foods", "grocery", "groceries", "meal", "meals"},
    "clothing": {"clothing", "clothes", "apparel", "garment", "garments"},
    "blanket": {"blanket", "blankets", "bedding"},
    "medicine": {"medicine", "medicines", "medication", "medications", "drug", "drugs"},
    "book": {"book", "books", "textbook", "textbooks"},
}

TOKEN_TO_GROUP = {
    token: group
    for group, tokens in TOKEN_GROUPS.items()
    for token in tokens
}

GENERIC_WORDS = {
    "need", "needs", "needed", "request", "requesting", "provide",
    "providing", "available", "resource", "resources", "item", "items",
    "for", "the", "and", "with", "of", "a", "an", "some",
}


def normalize_unit(unit: str) -> str:
    value = re.sub(r"\\s+", " ", unit.strip().lower())
    return UNIT_ALIASES.get(value, value)


def semantic_tokens(value: str) -> set[str]:
    words = re.findall(r"[a-z0-9]+", value.lower())
    return {
        TOKEN_TO_GROUP.get(word, word)
        for word in words
        if word not in GENERIC_WORDS and len(word) > 1
    }


def is_category_relevant(request: MatchRequest, candidate: MatchCandidate) -> bool:
    request_category = request.category.strip().lower()
    candidate_category = candidate.category.strip().lower()

    if request_category == candidate_category:
        return True

    request_text = " ".join([request.category, request.title, request.description])
    candidate_text = " ".join([candidate.category, candidate.title, candidate.description])

    request_terms = semantic_tokens(request_text)
    candidate_terms = semantic_tokens(candidate_text)

    # A related-category match needs a meaningful shared item/synonym term.
    return bool(request_terms.intersection(candidate_terms))


def calculate_distance(lat1, lon1, lat2, lon2):
    """Calculate distance between two coordinates using Haversine formula."""
    earth_radius_km = 6371.0
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    delta_lat = lat2 - lat1
    delta_lon = lon2 - lon1
    a = (
        sin(delta_lat / 2) ** 2
        + cos(lat1) * cos(lat2) * sin(delta_lon / 2) ** 2
    )
    return 2 * earth_radius_km * atan2(sqrt(a), sqrt(1 - a))


def get_location_score(request, candidate):
    if request.latitude is not None and candidate.latitude is not None:
        distance = calculate_distance(
            request.latitude, request.longitude,
            candidate.latitude, candidate.longitude,
        )
        score = max(0, 100 * (1 - distance / 50))
        return score, round(distance, 2)

    same_location = request.location.strip().lower() == candidate.location.strip().lower()
    return (100 if same_location else 35), None


def get_quantity_score(request, candidate):
    if candidate.quantity_available < request.quantity:
        return 0
    surplus = candidate.quantity_available - request.quantity
    surplus_ratio = surplus / request.quantity
    return max(0, 100 - (surplus_ratio * 25))


def get_condition_score(condition):
    return {
        "new": 100,
        "good": 85,
        "fair": 65,
        "not-applicable": 80,
    }.get(condition, 50)


def get_weights(urgency):
    return {
        "low": {"location": 30, "quantity": 30, "condition": 20, "availability": 20},
        "medium": {"location": 40, "quantity": 25, "condition": 15, "availability": 20},
        "high": {"location": 45, "quantity": 25, "condition": 10, "availability": 20},
        "critical": {"location": 50, "quantity": 20, "condition": 10, "availability": 20},
    }[urgency]


def rank_candidates(request: MatchRequest, candidates: list[MatchCandidate]):
    ranked_matches = []
    weights = get_weights(request.urgency)

    for candidate in candidates:
        if not candidate.available:
            continue

        if not is_category_relevant(request, candidate):
            continue

        # Normalize spelling/plural aliases, but never assume conversions
        # between unlike units (e.g. bags, kg, packets, and litres).
        if normalize_unit(candidate.unit) != normalize_unit(request.unit):
            continue

        if candidate.quantity_available < request.quantity:
            continue

        location_score, distance = get_location_score(request, candidate)
        quantity_score = get_quantity_score(request, candidate)
        condition_score = get_condition_score(candidate.condition)
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
            "Category relevance checked against item details",
            "Unit is compatible",
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

    ranked_matches.sort(key=lambda match: match.score, reverse=True)
    for index, match in enumerate(ranked_matches):
        match.rank = index + 1
    return ranked_matches
