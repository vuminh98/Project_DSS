# GIS input contract

Copy Germany source rasters into `germany/source/`.

The first candidate shown by the project owner is:

- `Aquifer_raster.tif`

The confirmed five inputs and their actual source filenames are:

- `closure.tif`: Closure of Mining Work
- `typeofmining_raster.tif`: Type of Mining
- `Aquifer_raster.tif`: Presence of an Aquifer in Overburden
- `coalseam_raster.tif`: Shallow Coal Seam
- `lithologie_raster.tif`: Geology of the Overburden

Aquifer has been confirmed as a direct hazard input.

The approved raw-index formula supplied so far is:

`SHI_raw = sum(H_i * N_i * I_i)`

`N_i` is implemented as the number of interaction edges involving hazard `i`.
For the UI's simple chain this produces `[1, 2, ..., 2, 1]`. The conversion
from raw SHI to classes 1-9 is not yet defined and must be supplied separately.

`I_i` is entered separately for each hazard as 1 (low), 2 (moderate), or 3
(high), matching the values displayed on the hazard cards in the supplied example.

Sidecar files such as `.tfw`, `.aux.xml`, `.cpg` and `.dbf` should be preserved until the GeoTIFF is inspected. A valid GeoTIFF normally embeds its transform and CRS, but the `.tfw` may be needed when georeferencing is not embedded. Files ending in `.vat.dbf` describe a raster attribute table and may contain class meanings.

Before MHI calculation, every raster must be checked for:

- CRS
- bounds and study-area coverage
- width, height and pixel resolution
- band count and data type
- NoData value
- unique pixel values and their scientific meaning
- alignment with the reference grid

The supplied world files show different pixel sizes and origins, so the five
source rasters must be reprojected/resampled to one approved reference grid
before the pixel-wise SHI calculation is valid. Source files remain unchanged;
aligned outputs belong in `germany/processed/`.

Do not rename or discard source sidecars yet.
