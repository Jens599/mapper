import type { Feature, FeatureCollection, LineString } from "geojson";

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

function curveSegment(
  start: Coordinate,
  end: Coordinate,
  curvature: number,
  winding: number,
): Coordinate[] {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const length = Math.hypot(dx, dy) || 1;
  const normalX = -dy / length;
  const normalY = dx / length;
  const points: Coordinate[] = [];

  for (let index = 0; index <= 24; index += 1) {
    const progress = index / 24;
    const envelope = Math.sin(Math.PI * progress);
    const broadCurve = envelope * curvature * length * 0.32;
    const handDrawn =
      envelope * Math.sin(progress * Math.PI * 6) * winding * length * 0.035;
    const offset = broadCurve + handDrawn;

    points.push([
      start[0] + dx * progress + normalX * offset,
      start[1] + dy * progress + normalY * offset,
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

  const anchors = [start.coordinates, ...leg.via, end.coordinates];
  const coordinates: Coordinate[] = [];

  for (let index = 0; index < anchors.length - 1; index += 1) {
    const segment = curveSegment(
      anchors[index],
      anchors[index + 1],
      leg.style.curvature,
      leg.style.winding,
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
