import type {
  Coordinate,
  TrailProject,
  TrailScatter,
  TravelProject,
  TravelScatter,
} from "@/lib/project-schema";
import { generateTrailRoute } from "@/lib/trail-geometry";
import { getLegCoordinates, getWrappedLongitudeBounds } from "@/lib/travel-geometry";

export type TravelScatterPlacement = {
  id: string;
  iconId: string;
  coordinates: Coordinate;
  scale: number;
  rotation: number;
};

export type TrailScatterPlacement = {
  id: string;
  iconId: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
};

function seededRandom(seed: number) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function randomRange(random: () => number, range: [number, number]) {
  const low = Math.min(...range);
  const high = Math.max(...range);
  return low + random() * (high - low);
}

function tripBounds(project: TravelProject) {
  const longitudes = project.stops.map((stop) => stop.coordinates[0]);
  const latitudes = project.stops.map((stop) => stop.coordinates[1]);
  const [west, east] = getWrappedLongitudeBounds(longitudes);
  return {
    west,
    east,
    south: Math.min(...latitudes),
    north: Math.max(...latitudes),
  };
}

function distanceKm(a: Coordinate, b: Coordinate) {
  const latitude = ((a[1] + b[1]) / 2) * (Math.PI / 180);
  const x = (a[0] - b[0]) * 111.32 * Math.cos(latitude);
  const y = (a[1] - b[1]) * 110.57;
  return Math.hypot(x, y);
}

function sampleTravelRegion(
  project: TravelProject,
  scatter: TravelScatter,
  random: () => number,
): Coordinate | null {
  const bounds = tripBounds(project);
  const width = Math.max(0.001, bounds.east - bounds.west);
  const height = Math.max(0.001, bounds.north - bounds.south);
  const region = scatter.region;

  if (region.type === "around-stop") {
    const stop = project.stops.find((item) => item.id === region.stopId);
    if (!stop) return null;
    const angle = random() * Math.PI * 2;
    const radius = Math.sqrt(random()) * region.radiusKm;
    return [
      stop.coordinates[0] +
        (Math.cos(angle) * radius) /
          (111.32 * Math.cos(stop.coordinates[1] * (Math.PI / 180))),
      stop.coordinates[1] + (Math.sin(angle) * radius) / 110.57,
    ];
  }

  if (region.type === "along-leg") {
    const leg = project.legs.find((item) => item.id === region.legId);
    if (!leg) return null;
    const path = getLegCoordinates(project, leg);
    if (path.length < 2) return null;
    const index = Math.min(path.length - 2, Math.floor(random() * (path.length - 1)));
    const start = path[index];
    const end = path[index + 1];
    const progress = random();
    const dx = end[0] - start[0];
    const dy = end[1] - start[1];
    const latitude = start[1] + dy * progress;
    const longitude = start[0] + dx * progress;
    const dxKm = dx * 111.32 * Math.cos(latitude * (Math.PI / 180));
    const dyKm = dy * 110.57;
    const lengthKm = Math.hypot(dxKm, dyKm) || 1;
    const offsetKm = (random() * 2 - 1) * region.corridorKm;
    return [
      longitude + (-dyKm / lengthKm) * (offsetKm / (111.32 * Math.cos(latitude * (Math.PI / 180)))),
      latitude + (dxKm / lengthKm) * (offsetKm / 110.57),
    ];
  }

  if (region.type === "bounds") {
    return [
      region.west + random() * (region.east - region.west),
      region.south + random() * (region.north - region.south),
    ];
  }

  const padding = region.padding;
  const west = bounds.west + width * padding;
  const east = bounds.east - width * padding;
  const south = bounds.south + height * padding;
  const north = bounds.north - height * padding;

  if (region.type === "trip-bounds") {
    return [west + random() * (east - west), south + random() * (north - south)];
  }

  if (region.edge === "north") {
    return [west + random() * (east - west), north - random() * height * region.band];
  }
  if (region.edge === "south") {
    return [west + random() * (east - west), south + random() * height * region.band];
  }
  if (region.edge === "east") {
    return [east - random() * width * region.band, south + random() * (north - south)];
  }
  return [west + random() * width * region.band, south + random() * (north - south)];
}

export function generateTravelScatter(
  project: TravelProject,
  scatter: TravelScatter,
): TravelScatterPlacement[] {
  const random = seededRandom(scatter.seed);
  const placements: TravelScatterPlacement[] = [];
  const maxAttempts = Math.min(10_000, Math.max(100, scatter.count * 20));

  for (let attempt = 0; attempt < maxAttempts && placements.length < scatter.count; attempt += 1) {
    const sampled = sampleTravelRegion(project, scatter, random);
    if (!sampled) break;
    const coordinates: Coordinate = [
      ((sampled[0] + 180) % 360 + 360) % 360 - 180,
      Math.min(89.999, Math.max(-89.999, sampled[1])),
    ];
    if (
      scatter.minSpacingKm > 0 &&
      placements.some(
        (placement) => distanceKm(placement.coordinates, coordinates) < scatter.minSpacingKm,
      )
    ) {
      continue;
    }
    const stopExclusion = Math.max(2, scatter.minSpacingKm);
    if (
      project.stops.some(
        (stop) => distanceKm(stop.coordinates, coordinates) < stopExclusion,
      )
    ) {
      continue;
    }
    placements.push({
      id: `${scatter.id}-${placements.length}`,
      iconId: scatter.iconId,
      coordinates,
      scale: randomRange(random, scatter.appearance.scale),
      rotation: randomRange(random, scatter.appearance.rotation),
    });
  }
  return placements;
}

function sampleTrailRegion(
  project: TrailProject,
  scatter: TrailScatter,
  random: () => number,
): { x: number; y: number } | null {
  const region = scatter.region;
  if (region.type === "around-waypoint") {
    const waypoint = project.waypoints.find((item) => item.id === region.waypointId);
    if (!waypoint) return null;
    const angle = random() * Math.PI * 2;
    const radius = Math.sqrt(random()) * region.radius;
    return {
      x: waypoint.x + Math.cos(angle) * radius,
      y: waypoint.y + Math.sin(angle) * radius,
    };
  }
  if (region.type === "along-route") {
    const route = project.routes.find((item) => item.id === region.routeId);
    if (!route) return null;
    const path = generateTrailRoute(project, route);
    if (path.length < 2) return null;
    const index = Math.min(path.length - 2, Math.floor(random() * (path.length - 1)));
    const start = path[index];
    const end = path[index + 1];
    const progress = random();
    const dx = end[0] - start[0];
    const dy = end[1] - start[1];
    const length = Math.hypot(dx, dy) || 1;
    const offset = (random() * 2 - 1) * region.corridor;
    return {
      x: start[0] + dx * progress + (-dy / length) * offset,
      y: start[1] + dy * progress + (dx / length) * offset,
    };
  }
  if (region.type === "rectangle") {
    return {
      x: region.x + random() * region.width,
      y: region.y + random() * region.height,
    };
  }

  const padding = region.padding;
  const left = padding;
  const right = project.canvas.width - padding;
  const top = padding;
  const bottom = project.canvas.height - padding;
  if (region.type === "canvas") {
    return { x: left + random() * (right - left), y: top + random() * (bottom - top) };
  }
  if (region.edge === "top") {
    return { x: left + random() * (right - left), y: top + random() * project.canvas.height * region.band };
  }
  if (region.edge === "bottom") {
    return { x: left + random() * (right - left), y: bottom - random() * project.canvas.height * region.band };
  }
  if (region.edge === "right") {
    return { x: right - random() * project.canvas.width * region.band, y: top + random() * (bottom - top) };
  }
  return { x: left + random() * project.canvas.width * region.band, y: top + random() * (bottom - top) };
}

export function generateTrailScatter(
  project: TrailProject,
  scatter: TrailScatter,
): TrailScatterPlacement[] {
  const random = seededRandom(scatter.seed);
  const placements: TrailScatterPlacement[] = [];
  const maxAttempts = Math.min(10_000, Math.max(100, scatter.count * 20));
  for (let attempt = 0; attempt < maxAttempts && placements.length < scatter.count; attempt += 1) {
    const point = sampleTrailRegion(project, scatter, random);
    if (!point) break;
    if (
      scatter.minSpacing > 0 &&
      placements.some((placement) => Math.hypot(placement.x - point.x, placement.y - point.y) < scatter.minSpacing)
    ) {
      continue;
    }
    const waypointExclusion = Math.max(18, scatter.minSpacing);
    if (
      project.waypoints.some(
        (waypoint) => Math.hypot(waypoint.x - point.x, waypoint.y - point.y) < waypointExclusion,
      )
    ) {
      continue;
    }
    placements.push({
      id: `${scatter.id}-${placements.length}`,
      iconId: scatter.iconId,
      ...point,
      scale: randomRange(random, scatter.appearance.scale),
      rotation: randomRange(random, scatter.appearance.rotation),
    });
  }
  return placements;
}

export function geographicToSymbolic(
  project: TravelProject,
  coordinates: Coordinate,
) {
  const bounds = tripBounds(project);
  let longitude = coordinates[0];
  while (longitude < bounds.west) longitude += 360;
  while (longitude > bounds.west + 360) longitude -= 360;
  const xRatio = (longitude - bounds.west) / Math.max(0.001, bounds.east - bounds.west);
  const yRatio = (coordinates[1] - bounds.south) / Math.max(0.001, bounds.north - bounds.south);
  return {
    x: 100 + xRatio * 800,
    y: 620 - yRatio * 540,
  };
}
