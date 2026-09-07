STUDY_CASES = {
    "germany": {
        "id": "germany",
        "country": "Germany",
        "name": "Southern Ruhr",
        "center": [51.45, 7.15],
        "zoom": 9,
        "hazards": [
            {
                "category": "mining",
                "id": "year_closure",
                "name": "Closure of Mining Work",
                "filename": "closure.tif",
                "status": "awaiting_file",
            },
            {
                "category": "mining",
                "id": "mining_work_type",
                "name": "Type of Mining",
                "filename": "typeofmining_raster.tif",
                "status": "awaiting_file",
            },
            {
                "category": "natural",
                "id": "aquifer",
                "name": "Presence of an Aquifer in Overburden",
                "filename": "Aquifer_raster.tif",
                "status": "awaiting_file",
            },
            {
                "category": "mining",
                "id": "coal_seam",
                "name": "Shallow Coal Seam",
                "filename": "coalseam_raster.tif",
                "status": "awaiting_file",
            },
            {
                "category": "natural",
                "id": "lithology",
                "name": "Geology of the Overburden",
                "filename": "lithologie_raster.tif",
                "status": "awaiting_file",
            },
        ],
    }
}

# No approved recommendations were supplied for the five new factors. Users
# therefore enter I_i explicitly (1=low, 2=moderate, 3=high).
INTERACTION_MATRIX = {}
