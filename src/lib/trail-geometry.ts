import { Noise } from "noisejs";

import type { Coordinate, TrailProject, TrailRoute } from "@/lib/project-schema";

function hashRandom(seed: number, index: number) {
  const value = Math.sin(seed * 12.9898 + index * 78.233) * 43_758.5453;
  return (value - Math.floor(value)) * 2 - 1;
}

export function generateTrailRoute(
  project: TrailProject,
  route: TrailRoute,
): Coordinate[] {
  const noise = new Noise(route.noise.seed);
  const waypoints = route.waypointIds
    .map((id) => project.waypoints.find((point) => point.id === id))
    .filter((point): point is TrailProject["waypoints"][number] => Boolean(point));
  const result: Coordinate[] = [];

  for (let segmentIndex = 0; segmentIndex < waypoints.length - 1; segmentIndex += 1) {
    const start = waypoints[segmentIndex];
    const end = waypoints[segmentIndex + 1];
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.hypot(dx, dy) || 1;
    const normalX = -dy / length;
    const normalY = dx / length;
    const samples = Math.max(24, Math.ceil(length / 4));

    for (let index = 0; index <= samples; index += 1) {
      if (segmentIndex > 0 && index === 0) continue;
      const progress = index / samples;
      const distance = progress * length;
      const envelope = Math.sin(Math.PI * progress);
      let frequency = 1 / route.noise.wavelength;
      let amplitude = 1;
      let total = 0;
      let normalization = 0;

      for (let octave = 0; octave < route.noise.octaves; octave += 1) {
        const warp =
          noise.perlin2(distance * frequency * 0.65, segmentIndex + 17) *
          route.noise.warpStrength *
          route.noise.wavelength;
        total += noise.perlin2((distance + warp) * frequency, segmentIndex) * amplitude;
        normalization += amplitude;
        amplitude *= route.noise.persistence;
        frequency *= route.noise.lacunarity;
      }

      const baseNoise = normalization ? total / normalization : 0;
      const modulation =
        1 +
        noise.perlin2(distance / (route.noise.wavelength * 1.8), 91) *
          route.noise.modulationStrength;
      const jitter =
        hashRandom(route.noise.seed + segmentIndex, index) * route.noise.jitter;
      const offset =
        (baseNoise * modulation + jitter) * route.noise.amplitude * envelope;

      result.push([
        start.x + dx * progress + normalX * offset,
        start.y + dy * progress + normalY * offset,
      ]);
    }
  }

  return result;
}

export function generateConceptContours(project: TrailProject): string[] {
  const noise = new Noise(project.terrain.seed);
  const peaks = project.waypoints
    .filter((point) => point.elevation)
    .sort((a, b) => (b.elevation ?? 0) - (a.elevation ?? 0))
    .slice(0, 2);
  const paths: string[] = [];

  for (const [peakIndex, peak] of peaks.entries()) {
    for (let level = 1; level <= 7; level += 1) {
      const radiusX = level * (34 + peakIndex * 8);
      const radiusY = level * (22 + peakIndex * 5);
      const points: Coordinate[] = [];
      for (let index = 0; index <= 80; index += 1) {
        const angle = (index / 80) * Math.PI * 2;
        const variation = 1 + noise.perlin2(Math.cos(angle) + level, Math.sin(angle) + peakIndex) * 0.16;
        points.push([
          peak.x + Math.cos(angle) * radiusX * variation,
          peak.y + Math.sin(angle) * radiusY * variation,
        ]);
      }
      paths.push(
        points
          .map(([x, y], index) => `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`)
          .join(" ") + " Z",
      );
    }
  }

  return paths;
}
