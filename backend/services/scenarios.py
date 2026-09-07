from catalog import INTERACTION_MATRIX


class ScenarioValidationError(ValueError):
    pass


def recommended_interaction(source: str, target: str):
    direct = INTERACTION_MATRIX.get(source, {}).get(target)
    if direct is not None:
        return direct
    return INTERACTION_MATRIX.get(target, {}).get(source)


def validate_scenario(payload: dict, allowed_hazards: set[str]) -> dict:
    hazards = payload.get("hazards")
    if not isinstance(hazards, list) or not 2 <= len(hazards) <= 5:
        raise ScenarioValidationError("Select between 2 and 5 hazards for a multi-hazard scenario.")

    ids = [item.get("id") for item in hazards if isinstance(item, dict)]
    if len(ids) != len(hazards) or len(ids) != len(set(ids)):
        raise ScenarioValidationError("Every hazard must be unique and have an id.")
    unknown = set(ids) - allowed_hazards
    if unknown:
        raise ScenarioValidationError(f"Unknown hazards: {', '.join(sorted(unknown))}.")
    for item in hazards:
        if item.get("interaction_level") not in (1, 2, 3):
            raise ScenarioValidationError("Every hazard must have an interaction level I_i of 1, 2 or 3.")

    interactions = payload.get("interactions", [])
    expected_pairs = max(0, len(ids) - 1)
    if len(interactions) != expected_pairs:
        raise ScenarioValidationError("An interaction level is required between every two consecutive hazards.")
    for interaction in interactions:
        source = interaction.get("source")
        target = interaction.get("target")
        if source not in ids or target not in ids or source == target:
            raise ScenarioValidationError("Interaction endpoints must be selected hazards.")

    return {"name": payload.get("name", "Scenario 1"), "hazards": hazards, "interactions": interactions}
