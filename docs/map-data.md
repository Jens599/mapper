# Open Map Data

## Basemap

Travel mode renders OpenStreetMap-derived vector tiles from OpenFreeMap with
MapLibre GL JS. The default style is Positron because its quiet roads and labels
leave itinerary routes, day tags, and symbols visually dominant.

OpenFreeMap's public service requires no account or API key and permits
commercial usage. It has no service-level guarantee, so production deployments
that require guaranteed availability should self-host its open stack or select a
provider with an SLA.

Do not replace OpenFreeMap with `tile.openstreetmap.org`. OpenStreetMap's standard
community raster servers prohibit bulk downloading and are not an application
tile backend.

## Elevation and contours

Mapzen Terrain Tiles are fetched from the AWS Open Data Registry in Terrarium
encoding. `maplibre-contour` decodes nearby DEM tiles and creates contour vector
tiles in the browser. The same DEM source supplies optional hillshade.

Contour generation is visual context, not a survey product. Source DEM accuracy,
resolution, and age vary geographically.

## Attribution

Interactive maps display attribution through MapLibre's attribution control.
Map-backed screenshots and background exports must retain visible attribution to
OpenStreetMap, OpenMapTiles/OpenFreeMap, and Mapzen Terrain Tiles.

Transparent overlay SVG does not include basemap data and therefore contains no
map attribution block.

## Network behavior

- Vector and elevation tiles are requested only for the visible map.
- The browser honors normal HTTP caching.
- Mapper does not bulk-download or package hosted tiles for offline use.
- Trail sketch mode needs no tile requests.

## Future routing

Travel legs currently use user-controlled illustrative geometry. A routing
adapter can later use OpenRouteService, Valhalla, or imported GPX/GeoJSON. Hosted
routing services have independent quotas and terms and must remain optional.
