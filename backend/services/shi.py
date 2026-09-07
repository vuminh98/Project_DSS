import math
from pathlib import Path

import numpy as np
import rasterio
from PIL import Image
from rasterio.enums import Resampling
from rasterio.transform import from_origin
from rasterio.warp import reproject, transform_bounds


class RasterCalculationError(ValueError):
    pass


CLASS_COLORS = np.array([
    [0, 0, 0, 0], [49, 54, 149, 210], [69, 117, 180, 210],
    [116, 173, 209, 210], [171, 217, 233, 210], [255, 255, 191, 210],
    [253, 174, 97, 210], [244, 109, 67, 210], [215, 48, 39, 210],
    [165, 0, 38, 220],
], dtype=np.uint8)


def _interaction_terms(scenario: dict) -> dict[str, tuple[int, int]]:
    counts = {item["id"]: 0 for item in scenario["hazards"]}
    for edge in scenario["interactions"]:
        counts[edge["source"]] += 1
        counts[edge["target"]] += 1
    return {item["id"]: (counts[item["id"]], item["interaction_level"]) for item in scenario["hazards"]}


def _common_grid(datasets):
    crs = datasets[0].crs
    if crs is None or any(dataset.crs != crs for dataset in datasets):
        raise RasterCalculationError("All selected rasters must have the same defined CRS.")
    left = max(dataset.bounds.left for dataset in datasets)
    bottom = max(dataset.bounds.bottom for dataset in datasets)
    right = min(dataset.bounds.right for dataset in datasets)
    top = min(dataset.bounds.top for dataset in datasets)
    if left >= right or bottom >= top:
        raise RasterCalculationError("The selected rasters do not overlap.")
    resolution = max(max(abs(dataset.res[0]), abs(dataset.res[1])) for dataset in datasets)
    width = max(1, math.ceil((right - left) / resolution))
    height = max(1, math.ceil((top - bottom) / resolution))
    return crs, from_origin(left, top, resolution, resolution), width, height


def calculate_shi_overlay(scenario: dict, files_by_id: dict[str, Path], png_path: Path) -> dict:
    """Apply per-cell Map Algebra and render relative SHI classes for Leaflet."""
    ordered_ids = [item["id"] for item in scenario["hazards"]]
    terms = _interaction_terms(scenario)
    datasets = [rasterio.open(files_by_id[hazard_id]) for hazard_id in ordered_ids]
    try:
        crs, transform, width, height = _common_grid(datasets)
        raw = np.zeros((height, width), dtype="float32")
        coverage = np.ones((height, width), dtype=bool)
        details = []
        for hazard_id, dataset in zip(ordered_ids, datasets):
            destination = np.zeros((height, width), dtype="float32")
            source = dataset.read(1, masked=True)
            reproject(source=source.filled(0).astype("float32"), destination=destination,
                      src_transform=dataset.transform, src_crs=dataset.crs, src_nodata=dataset.nodata,
                      dst_transform=transform, dst_crs=crs, dst_nodata=0, resampling=Resampling.nearest)
            source_valid = (~np.ma.getmaskarray(source)).astype("uint8")
            valid_destination = np.zeros((height, width), dtype="uint8")
            reproject(source=source_valid, destination=valid_destination,
                      src_transform=dataset.transform, src_crs=dataset.crs, src_nodata=0,
                      dst_transform=transform, dst_crs=crs, dst_nodata=0, resampling=Resampling.nearest)
            coverage &= valid_destination.astype(bool)
            count, level = terms[hazard_id]
            raw += destination * count * level
            details.append({"hazard": hazard_id, "N_i": count, "I_i": level})

        theoretical_max = sum(3 * count * level for count, level in terms.values())
        classes = np.zeros(raw.shape, dtype="uint8")
        positive = coverage & (raw > 0)
        if theoretical_max > 0:
            classes[positive] = np.clip(np.ceil(raw[positive] * 9 / theoretical_max), 1, 9).astype("uint8")
        rgba = CLASS_COLORS[classes]
        rgba[~coverage, 3] = 0
        png_path.parent.mkdir(parents=True, exist_ok=True)
        Image.fromarray(rgba, mode="RGBA").save(png_path, "PNG", optimize=True)

        west, south, east, north = transform_bounds(
            crs, "EPSG:4326", *rasterio.transform.array_bounds(height, width, transform)
        )
        valid_values = raw[coverage]
        return {
            "bounds": [[south, west], [north, east]],
            "raw_min": float(valid_values.min()) if valid_values.size else None,
            "raw_max": float(valid_values.max()) if valid_values.size else None,
            "theoretical_max": theoretical_max,
            "terms": details,
            "classes": list(range(1, 10)),
            "classification": "nine equal intervals of the theoretical maximum",
        }
    finally:
        for dataset in datasets:
            dataset.close()
