import { writeFile } from "node:fs/promises";

const url = "https://nominatim.openstreetmap.org/search?country=Nepal&format=jsonv2&polygon_geojson=1&limit=1";

function perpendicularDistance(point, start, end) {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  if (!dx && !dy) return Math.hypot(point[0] - start[0], point[1] - start[1]);
  const progress = Math.max(
    0,
    Math.min(1, ((point[0] - start[0]) * dx + (point[1] - start[1]) * dy) / (dx * dx + dy * dy)),
  );
  return Math.hypot(point[0] - (start[0] + progress * dx), point[1] - (start[1] + progress * dy));
}

function simplify(points, epsilon) {
  if (points.length <= 2) return points;
  let maxDistance = 0;
  let index = 0;
  for (let i = 1; i < points.length - 1; i += 1) {
    const distance = perpendicularDistance(points[i], points[0], points[points.length - 1]);
    if (distance > maxDistance) {
      maxDistance = distance;
      index = i;
    }
  }
  if (maxDistance <= epsilon) return [points[0], points[points.length - 1]];
  return [...simplify(points.slice(0, index + 1), epsilon).slice(0, -1), ...simplify(points.slice(index), epsilon)];
}

const response = await fetch(url, {
  headers: { "User-Agent": "mapper-boundary-cache/1.0" },
});
if (!response.ok) throw new Error(`Boundary fetch failed: ${response.status}`);

const [result] = await response.json();
if (!result?.geojson) throw new Error("Nominatim did not return a GeoJSON boundary.");

const geometry = result.geojson;
const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
const exteriorRing = polygons.map((polygon) => polygon[0]).sort((a, b) => b.length - a.length)[0];

const longitudes = exteriorRing.map(([longitude]) => longitude);
const latitudes = exteriorRing.map(([, latitude]) => latitude);
const minLongitude = Math.min(...longitudes);
const maxLongitude = Math.max(...longitudes);
const minLatitude = Math.min(...latitudes);
const maxLatitude = Math.max(...latitudes);

const width = 1000;
const height = 360;
const padding = 18;
const scale = Math.min(
  (width - padding * 2) / (maxLongitude - minLongitude),
  (height - padding * 2) / (maxLatitude - minLatitude),
);
const drawnWidth = (maxLongitude - minLongitude) * scale;
const drawnHeight = (maxLatitude - minLatitude) * scale;
const offsetX = (width - drawnWidth) / 2;
const offsetY = (height - drawnHeight) / 2;

const projected = exteriorRing.map(([longitude, latitude]) => [
  offsetX + (longitude - minLongitude) * scale,
  offsetY + (maxLatitude - latitude) * scale,
]);
const simplified = simplify(projected, 2.2);
const path = `${simplified.map(([x, y], index) => `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ")} Z`;

await writeFile(
  "src/data/nepal-boundary.ts",
  `// Generated once from OpenStreetMap/Nominatim boundary data. Do not fetch at runtime.\nexport const nepalBoundary = {\n  viewBox: \"0 0 ${width} ${height}\",\n  path: ${JSON.stringify(path)},\n  attribution: \"Nepal boundary from OpenStreetMap contributors\",\n  source: ${JSON.stringify(result.licence ?? "Data © OpenStreetMap contributors")},\n};\n`,
);

console.log(`Saved Nepal boundary: ${exteriorRing.length} points simplified to ${simplified.length}.`);
