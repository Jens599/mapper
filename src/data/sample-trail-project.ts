import { parseProject, type TrailProject } from "@/lib/project-schema";

export const sampleTrailProject = parseProject({
  version: 2,
  kind: "trail",
  id: "alder-ridge-trail",
  name: "Alder Ridge trail",
  units: "m",
  canvas: {
    width: 1_000,
    height: 700,
    background: "#e9efeb",
    showGrid: true,
  },
  terrain: {
    visible: true,
    seed: 42,
    contourInterval: 20,
    opacity: 0.52,
  },
  waypoints: [
    { id: "trailhead", name: "Trailhead", x: 120, y: 570, elevation: 220, visible: true },
    { id: "creek-crossing", name: "Creek crossing", x: 390, y: 430, elevation: 275, visible: true },
    { id: "ridge-lookout", name: "Ridge lookout", x: 650, y: 245, elevation: 440, visible: true },
    { id: "north-camp", name: "North camp", x: 865, y: 130, elevation: 390, visible: true },
  ],
  routes: [
    {
      id: "ridge-route",
      name: "Ridge route",
      waypointIds: ["trailhead", "creek-crossing", "ridge-lookout", "north-camp"],
      mode: "joined",
      noise: {
        seed: 81,
        amplitude: 28,
        wavelength: 90,
        octaves: 3,
        persistence: 0.5,
        lacunarity: 2,
        warpStrength: 0.35,
        modulationStrength: 0.2,
        jitter: 0.08,
        smoothing: 0.62,
      },
      visible: true,
    },
  ],
  icons: [
    { id: "camp-icon", iconId: "carbon-campsite", x: 865, y: 105, scale: 1, rotation: 0, visible: true },
    { id: "mountain-icon", iconId: "carbon-mountain", x: 650, y: 205, scale: 1, rotation: 0, visible: true },
  ],
}) as TrailProject;
