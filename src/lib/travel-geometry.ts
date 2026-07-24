import type { Feature, FeatureCollection, LineString } from "geojson";
import { Noise } from "noisejs";

import type {
  Coordinate,
  TravelProject,
  TravelLeg,
} from "@/lib/project-schema";

export type TravelLegProperties = {
  id: string;
  name: string;
  mode: TravelLeg["mode"];
  line: TravelLeg["style"]["line"];
  color: string;
  selected: boolean;
};

export function getWrappedLongitudeBounds(longitudes: number[]): [number, number] {
  const values = longitudes
    .map((value) => ((value % 360) + 360) % 360)
    .sort((a, b) => a - b);
  if (values.length <= 1) return [values[0] ?? 0, values[0] ?? 0];
  let largestGap = -1;
  let gapIndex = 0;
  for (let index = 0; index < values.length; index += 1) {
    const next = index === values.length - 1 ? values[0] + 360 : values[index + 1];
    const gap = next - values[index];
    if (gap > largestGap) {
      largestGap = gap;
      gapIndex = index;
    }
  }
  let west = values[(gapIndex + 1) % values.length];
  let east = values[gapIndex];
  if (east < west) east += 360;
  if (west > 180) {
    west -= 360;
    east -= 360;
  }
  return [west, east];
}

export function getSymbolicStopPositions(project: TravelProject) {
  const positions = new Map<string, { x: number; y: number }>();
  const count = Math.max(1, project.stops.length - 1);

  project.stops.forEach((stop, index) => {
    const progress = index / count;
    positions.set(
      stop.id,
      stop.diagramPosition ?? {
        x: 850 - progress * 700,
        y: 505 - progress * 355 + Math.sin(index * 1.65) * 58,
      },
    );
  });

  return positions;
}

function curveSegment(
  start: Coordinate,
  end: Coordinate,
  style: TravelLeg["style"],
  segmentIndex: number,
): Coordinate[] {
  const meanLatitude = ((start[1] + end[1]) / 2) * (Math.PI / 180);
  const longitudeKm = Math.max(0.01, 111.32 * Math.cos(meanLatitude));
  const dx = (end[0] - start[0]) * longitudeKm;
  const dy = (end[1] - start[1]) * 110.57;
  const length = Math.hypot(dx, dy) || 1;
  const normalX = -dy / length;
  const normalY = dx / length;
  const points: Coordinate[] = [];
  const noise = new Noise(style.noiseSeed + segmentIndex * 101);

  for (let index = 0; index <= 48; index += 1) {
    const progress = index / 48;
    const envelope = Math.sin(Math.PI * progress);
    const broadCurve = envelope * style.curvature * length * 0.32;
    const handDrawn =
      envelope * Math.sin(progress * Math.PI * 6) * style.winding * length * 0.035;
    let frequency = style.noiseScale;
    let amplitude = 1;
    let noiseValue = 0;
    let normalization = 0;
    for (let octave = 0; octave < style.noiseOctaves; octave += 1) {
      noiseValue += noise.perlin2(progress * frequency, segmentIndex + 17) * amplitude;
      normalization += amplitude;
      frequency *= 2;
      amplitude *= 0.5;
    }
    const modulation =
      1 +
      noise.perlin2(progress * style.noiseScale * 0.5, segmentIndex + 71) *
        style.noiseModulation;
    const perlin =
      envelope *
      (noiseValue / Math.max(0.001, normalization)) *
      style.noiseAmplitude *
      length *
      0.12 *
      modulation;
    const offset = broadCurve + handDrawn + perlin;

    const xKm = dx * progress + normalX * offset;
    const yKm = dy * progress + normalY * offset;
    points.push([
      start[0] + xKm / longitudeKm,
      Math.min(89.999, Math.max(-89.999, start[1] + yKm / 110.57)),
    ]);
  }

  return points;
}

export function getLegCoordinates(
  project: TravelProject,
  leg: TravelLeg,
): Coordinate[] {
  const start = project.stops.find((stop) => stop.id === leg.from);
  const end = project.stops.find((stop) => stop.id === leg.to);

  if (!start || !end) return [];

  const rawAnchors = [start.coordinates, ...leg.via, end.coordinates];
  const anchors: Coordinate[] = [rawAnchors[0]];
  for (const anchor of rawAnchors.slice(1)) {
    let longitude = anchor[0];
    const previous = anchors[anchors.length - 1][0];
    while (longitude - previous > 180) longitude -= 360;
    while (longitude - previous < -180) longitude += 360;
    anchors.push([longitude, anchor[1]]);
  }
  const coordinates: Coordinate[] = [];

  for (let index = 0; index < anchors.length - 1; index += 1) {
    const segment = curveSegment(
      anchors[index],
      anchors[index + 1],
      leg.style,
      index,
    );
    coordinates.push(...(index === 0 ? segment : segment.slice(1)));
  }

  return coordinates;
}

export function buildTravelLegsGeoJson(
  project: TravelProject,
  selectedObjectId: string | null,
): FeatureCollection<LineString, TravelLegProperties> {
  const features = project.legs
    .filter((leg) => leg.visible)
    .map<Feature<LineString, TravelLegProperties>>((leg) => ({
      type: "Feature",
      properties: {
        id: leg.id,
        name: leg.name,
        mode: leg.mode,
        line: leg.style.line,
        color: leg.style.color,
        selected: leg.id === selectedObjectId,
      },
      geometry: {
        type: "LineString",
        coordinates: getLegCoordinates(project, leg),
      },
    }));

  return { type: "FeatureCollection", features };
}
