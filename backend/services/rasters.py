from pathlib import Path


def raster_inventory(study_case: dict, source_dir: Path) -> list[dict]:
    inventory = []
    for hazard in study_case["hazards"]:
        path = source_dir / hazard["filename"]
        item = dict(hazard)
        item["available"] = path.is_file()
        item["status"] = "ready" if item["available"] else "awaiting_file"
        inventory.append(item)
    return inventory


def missing_rasters(selected_ids: set[str], inventory: list[dict]) -> list[str]:
    return [item["filename"] for item in inventory if item["id"] in selected_ids and not item["available"]]

