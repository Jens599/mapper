import type { BoundaryAsset } from "@/lib/project-schema";

type Geometry = {
  type: "Polygon" | "MultiPolygon";
  coordinates: number[][][] | number[][][][];
};

export type BoundaryBuildOptions = {
  id: string;
  name: string;
  source: string;
  attribution: string;
  geometry: Geometry;
  width?: number;
  height?: number;
  epsilon?: number;
};

function distanceToSegment(point: number[], start: number[], end: number[]) {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  if (!dx && !dy) return Math.hypot(point[0] - start[0], point[1] - start[1]);
  const progress = Math.max(
    0,
    Math.min(1, ((point[0] - start[0]) * dx + (point[1] - start[1]) * dy) / (dx * dx + dy * dy)),
  );
  return Math.hypot(point[0] - (start[0] + progress * dx), point[1] - (start[1] + progress * dy));
}

function simplify(points: number[][], epsilon: number): number[][] {
  if (points.length <= 2) return points;
  let maxDistance = 0;
  let index = 0;
  for (let i = 1; i < points.length - 1; i += 1) {
    const distance = distanceToSegment(points[i], points[0], points[points.length - 1]);
    if (distance > maxDistance) {
      maxDistance = distance;
      index = i;
    }
  }
  if (maxDistance <= epsilon) return [points[0], points[points.length - 1]];
  return [...simplify(points.slice(0, index + 1), epsilon).slice(0, -1), ...simplify(points.slice(index), epsilon)];
}

function exteriorRings(geometry: Geometry): number[][][] {
  if (geometry.type === "Polygon") return [(geometry.coordinates as number[][][])[0]];
  return (geometry.coordinates as number[][][][]).map((polygon) => polygon[0]);
}

export function slugifyBoundaryId(value: string) {
  const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `boundary-${slug || "area"}`;
}

export function boundaryFromGeometry(options: BoundaryBuildOptions): BoundaryAsset {
  const width = options.width ?? 1000;
  const height = options.height ?? 360;
  const epsilon = options.epsilon ?? 2.2;
  const rings = exteriorRings(options.geometry).filter((ring) => ring.length > 2);
  if (!rings.length) throw new Error("Boundary geometry has no exterior ring.");
  const points = rings.flat();
  const longitudes = points.map(([longitude]) => longitude);
  const latitudes = points.map(([, latitude]) => latitude);
  const minLongitude = Math.min(...longitudes);
  const maxLongitude = Math.max(...longitudes);
  const minLatitude = Math.min(...latitudes);
  const maxLatitude = Math.max(...latitudes);
  const padding = 18;
  const scale = Math.min(
    (width - padding * 2) / Math.max(0.0001, maxLongitude - minLongitude),
    (height - padding * 2) / Math.max(0.0001, maxLatitude - minLatitude),
  );
  const drawnWidth = (maxLongitude - minLongitude) * scale;
  const drawnHeight = (maxLatitude - minLatitude) * scale;
  const offsetX = (width - drawnWidth) / 2;
  const offsetY = (height - drawnHeight) / 2;
  const paths = rings.map((ring) => {
    const projected = ring.map(([longitude, latitude]) => [
      offsetX + (longitude - minLongitude) * scale,
      offsetY + (maxLatitude - latitude) * scale,
    ]);
    const simplified = simplify(projected, epsilon);
    return `${simplified.map(([x, y], index) => `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ")} Z`;
  });

  return {
    id: slugifyBoundaryId(options.id),
    name: options.name.trim().slice(0, 100) || "Boundary",
    source: options.source,
    attribution: options.attribution,
    viewBox: `0 0 ${width} ${height}`,
    path: paths.join(" "),
    visible: true,
    opacity: 0.08,
    fill: "#18221d",
    stroke: "#18221d",
  };
}

export function boundaryFromGeoJson(input: unknown, fallbackName = "Uploaded boundary") {
  const record = input as { type?: string; geometry?: Geometry; features?: Array<{ geometry?: Geometry; properties?: Record<string, unknown> }>; properties?: Record<string, unknown> };
  const feature = record.type === "FeatureCollection" ? record.features?.find((item) => item.geometry) : record.type === "Feature" ? record as { geometry?: Geometry; properties?: Record<string, unknown> } : null;
  const geometry = feature?.geometry ?? (record.type === "Polygon" || record.type === "MultiPolygon" ? record as Geometry : null);
  if (!geometry) throw new Error("Upload a Polygon or MultiPolygon GeoJSON boundary.");
  const name = String(feature?.properties?.name ?? record.properties?.name ?? fallbackName);
  return boundaryFromGeometry({
    id: name,
    name,
    source: "Uploaded GeoJSON",
    attribution: "Uploaded boundary",
    geometry,
  });
}

export async function fetchOsmBoundary(place: string) {
  const query = place.trim();
  if (!query) throw new Error("Enter a place name.");
  const params = new URLSearchParams({ q: query, format: "jsonv2", polygon_geojson: "1", limit: "1" });
  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
    headers: { "Accept-Language": "en" },
  });
  if (!response.ok) throw new Error(`OpenStreetMap boundary lookup failed (${response.status}).`);
  const results = await response.json() as Array<{ display_name?: string; name?: string; geojson?: Geometry; licence?: string; osm_type?: string; osm_id?: number }>;
  const result = results.find((item) => item.geojson?.type === "Polygon" || item.geojson?.type === "MultiPolygon");
  if (!result?.geojson) throw new Error("No polygon boundary found for that place.");
  return boundaryFromGeometry({
    id: result.name ?? query,
    name: result.name ?? query,
    source: `${result.osm_type ?? "osm"}/${result.osm_id ?? "unknown"}`,
    attribution: "Boundary from OpenStreetMap contributors",
    geometry: result.geojson,
  });
}
