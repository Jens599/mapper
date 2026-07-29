import { z } from "zod";

const idSchema = z
  .string()
  .min(1)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase kebab-case IDs");

export const coordinateSchema = z.tuple([
  z.number().min(-180).max(180),
  z.number().min(-90).max(90),
]);

export const stopSchema = z.object({
   id: idSchema,
   name: z.string().trim().min(1).max(80),
   coordinates: coordinateSchema,
   dayLabel: z.string().trim().min(1).max(24),
   icon: idSchema,
   elevation: z.number().finite().optional(),
   labelOffset: z.tuple([z.number().min(-300).max(300), z.number().min(-300).max(300)]).default([0, 0]),
   labelAnchor: z.enum(["auto", "top", "right", "bottom", "left"]).default("auto"),
    labelStyle: z.object({
      fontSize: z.number().min(0.5).max(3).default(1),
      color: z.string().regex(/^#[0-9a-f]{6}$/i).default("#18221d"),
      bold: z.boolean().default(true),
    }).default({ fontSize: 1, color: "#18221d", bold: true }),
    pointStyle: z.object({
      fill: z.string().regex(/^#[0-9a-f]{6}$/i).default("#e9efeb"),
      showFill: z.boolean().default(true),
      stroke: z.string().regex(/^#[0-9a-f]{6}$/i).default("#18221d"),
      showStroke: z.boolean().default(true),
      strokeWidth: z.number().min(0).max(10).default(2.5),
    }).default({ fill: "#e9efeb", showFill: true, stroke: "#18221d", showStroke: true, strokeWidth: 2.5 }),
    diagramPosition: z
     .object({ x: z.number().finite(), y: z.number().finite() })
     .optional(),
   visible: z.boolean().default(true),
 });

const presentationSchema = z.object({
  lineScale: z.number().min(0.25).max(4),
  textScale: z.number().min(0.5).max(3),
  symbolScale: z.number().min(0.25).max(4),
  arrowheadScale: z.number().min(0.4).max(2).default(0.5),
  lineHaloColor: z.string().regex(/^#[0-9a-f]{6}$/i).default("#ffffff"),
  linePathColor: z.string().regex(/^#[0-9a-f]{6}$/i).optional(),
  showArrowheads: z.boolean().default(true),
  showModeIcons: z.boolean().default(false),
  showLineHalo: z.boolean().default(true),
  showLegend: z.boolean().default(false),
  showTitleBlock: z.boolean().default(true),
  showMapSilhouette: z.boolean().default(false),
  showLeaderLines: z.boolean().default(false),
  emphasizeEndpoints: z.boolean().default(false),
  sequentialDayLabels: z.boolean().default(false),
  extraArrowheads: z.boolean().default(false),
  vividTransportColors: z.boolean().default(false),
  fillCanvas: z.boolean().default(false),
  largerDayText: z.boolean().default(false),
  titlePosition: z.object({ x: z.number().finite(), y: z.number().finite() }).default({ x: 54, y: 56 }),
});

export const legStyleSchema = z.object({
  line: z.enum(["solid", "dashed", "dotted"]),
  curvature: z.number().min(-10).max(10),
  winding: z.number().min(-10).max(10),
  noiseSeed: z.number().int().min(0).max(2_147_483_647).default(42),
  noiseAmplitude: z.number().min(-10).max(10).default(0),
  noiseScale: z.number().min(0.25).max(8).default(2),
  noiseOctaves: z.number().int().min(1).max(6).default(3),
  noiseModulation: z.number().min(-10).max(10).default(0),
  color: z.string().regex(/^#[0-9a-f]{6}$/i),
  showArrowhead: z.boolean().default(true),
});

export const travelLegSchema = z.object({
   id: idSchema,
   name: z.string().trim().min(1).max(100),
   from: idSchema,
   to: idSchema,
   mode: z.enum(["walk", "drive", "flight", "train", "boat"]),
   loopback: z.boolean().default(false),
   showDayLabel: z.boolean().default(false),
   iconId: idSchema.optional(),
   via: z.array(coordinateSchema).max(100).default([]),
   style: legStyleSchema,
   visible: z.boolean().default(true),
 });

export const iconAssetSchema = z.object({
  id: idSchema,
  name: z.string().trim().min(1).max(100),
  svg: z.string().min(1).max(250_000),
});

export const travelSymbolSchema = z.object({
  id: idSchema,
  iconId: idSchema,
  coordinates: coordinateSchema,
  scale: z.number().min(0.1).max(10),
  rotation: z.number().min(-360).max(360),
  diagramPosition: z
    .object({ x: z.number().finite(), y: z.number().finite() })
    .optional(),
  visible: z.boolean().default(true),
});

const scatterAppearanceSchema = z.object({
  scale: z.tuple([z.number().min(0.1).max(10), z.number().min(0.1).max(10)]),
  rotation: z.tuple([z.number().min(-360).max(360), z.number().min(-360).max(360)]),
});

const travelScatterRegionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("trip-bounds"),
    padding: z.number().min(0).max(1).default(0.08),
  }),
  z.object({
    type: z.literal("around-stop"),
    stopId: idSchema,
    radiusKm: z.number().positive().max(2_000),
  }),
  z.object({
    type: z.literal("along-leg"),
    legId: idSchema,
    corridorKm: z.number().positive().max(500),
  }),
  z.object({
    type: z.literal("bounds"),
    west: z.number().min(-180).max(180),
    south: z.number().min(-90).max(90),
    east: z.number().min(-180).max(180),
    north: z.number().min(-90).max(90),
  }),
  z.object({
    type: z.literal("map-edge"),
    edge: z.enum(["north", "south", "east", "west"]),
    band: z.number().min(0.02).max(0.5).default(0.18),
    padding: z.number().min(0).max(0.4).default(0.05),
  }),
]);

export const travelScatterSchema = z.object({
  id: idSchema,
  name: z.string().trim().min(1).max(100),
  iconId: idSchema,
  seed: z.number().int().min(0).max(2_147_483_647),
  count: z.number().int().min(1).max(2_000),
  minSpacingKm: z.number().min(0).max(500).default(0),
  region: travelScatterRegionSchema,
  appearance: scatterAppearanceSchema,
  visible: z.boolean().default(true),
});

export const boundaryAssetSchema = z.object({
  id: idSchema,
  name: z.string().trim().min(1).max(100),
  source: z.string().trim().max(240).default(""),
  attribution: z.string().trim().max(240).default("Boundary data"),
  viewBox: z.string().trim().min(1).max(80),
  path: z.string().trim().min(1).max(300_000),
  fill: z.string().regex(/^#[0-9a-f]{6}$/i).default("#18221d"),
  stroke: z.string().regex(/^#[0-9a-f]{6}$/i).default("#18221d"),
  opacity: z.number().min(0).max(1).default(0.08),
  visible: z.boolean().default(true),
});

const trailScatterRegionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("canvas"),
    padding: z.number().min(0).max(500).default(20),
  }),
  z.object({
    type: z.literal("around-waypoint"),
    waypointId: idSchema,
    radius: z.number().positive(),
  }),
  z.object({
    type: z.literal("along-route"),
    routeId: idSchema,
    corridor: z.number().positive(),
  }),
  z.object({
    type: z.literal("rectangle"),
    x: z.number().finite(),
    y: z.number().finite(),
    width: z.number().positive(),
    height: z.number().positive(),
  }),
  z.object({
    type: z.literal("canvas-edge"),
    edge: z.enum(["top", "bottom", "left", "right"]),
    band: z.number().min(0.02).max(0.5).default(0.18),
    padding: z.number().min(0).max(500).default(20),
  }),
]);

export const trailScatterSchema = z.object({
  id: idSchema,
  name: z.string().trim().min(1).max(100),
  iconId: idSchema,
  seed: z.number().int().min(0).max(2_147_483_647),
  count: z.number().int().min(1).max(2_000),
  minSpacing: z.number().min(0).max(1_000).default(0),
  region: trailScatterRegionSchema,
  appearance: scatterAppearanceSchema,
  visible: z.boolean().default(true),
});

export const trailNoiseSchema = z.object({
  seed: z.number().int().min(0).max(2_147_483_647),
  amplitude: z.number().min(0).max(500),
  wavelength: z.number().min(1).max(2_000),
  octaves: z.number().int().min(1).max(8),
  persistence: z.number().min(0).max(1),
  lacunarity: z.number().min(1).max(5),
  warpStrength: z.number().min(0).max(2),
  modulationStrength: z.number().min(0).max(2),
  jitter: z.number().min(0).max(1),
  smoothing: z.number().min(0).max(1),
});

export const trailWaypointSchema = z.object({
  id: idSchema,
  name: z.string().trim().min(1).max(80),
  x: z.number().finite(),
  y: z.number().finite(),
  elevation: z.number().finite().optional(),
  iconId: z.string().optional(),
  visible: z.boolean().default(true),
});

export const trailRouteSchema = z.object({
  id: idSchema,
  name: z.string().trim().min(1).max(100),
  waypointIds: z.array(idSchema).min(2),
  mode: z.enum(["joined", "segments"]),
  noise: trailNoiseSchema,
  visible: z.boolean().default(true),
});

const travelProjectSchema = z.object({
    version: z.literal(2),
    kind: z.literal("travel"),
    id: idSchema,
    name: z.string().trim().min(1).max(120),
    durationDays: z.number().int().positive().max(9_999),
    subtitle: z.string().trim().max(160).default(""),
    presentation: presentationSchema.default({
      lineScale: 1,
      textScale: 1,
      symbolScale: 1,
      arrowheadScale: 0.5,
      lineHaloColor: "#ffffff",
      showArrowheads: true,
      showModeIcons: false,
      showLineHalo: true,
      showLegend: false,
      showTitleBlock: true,
      showMapSilhouette: false,
      showLeaderLines: false,
      emphasizeEndpoints: false,
      sequentialDayLabels: false,
      extraArrowheads: false,
      vividTransportColors: false,
      fillCanvas: false,
      largerDayText: false,
      titlePosition: { x: 54, y: 56 },
    }),
    map: z.object({
      display: z.enum(["geographic", "symbolic"]).default("symbolic"),
      style: z.enum(["positron", "liberty", "bright"]),
      showContours: z.boolean(),
      showHillshade: z.boolean(),
      contourInterval: z.number().int().min(10).max(1_000),
      elevationUnits: z.enum(["m", "ft"]),
      background: z.string().regex(/^#[0-9a-f]{6}$/i).default("#e9efeb"),
    }),
    stops: z.array(stopSchema).min(2),
    legs: z.array(travelLegSchema),
    iconAssets: z.array(iconAssetSchema).default([]),
    symbols: z.array(travelSymbolSchema).default([]),
    scatter: z.array(travelScatterSchema).default([]),
    boundaries: z.array(boundaryAssetSchema).default([]),
  });

const trailProjectSchema = z.object({
  version: z.literal(2),
  kind: z.literal("trail"),
  id: idSchema,
  name: z.string().trim().min(1).max(120),
  units: z.enum(["m", "ft", "abstract"]),
  presentation: presentationSchema.default({
    lineScale: 1,
    textScale: 1,
    symbolScale: 1,
    arrowheadScale: 0.5,
    lineHaloColor: "#ffffff",
    showArrowheads: true,
    showModeIcons: false,
    showLineHalo: true,
    showLegend: false,
    showTitleBlock: true,
    showMapSilhouette: false,
    showLeaderLines: false,
    emphasizeEndpoints: false,
    sequentialDayLabels: false,
    extraArrowheads: false,
    vividTransportColors: false,
    fillCanvas: false,
    largerDayText: false,
    titlePosition: { x: 54, y: 56 },
  }),
  canvas: z.object({
    width: z.number().positive().max(100_000),
    height: z.number().positive().max(100_000),
    background: z.string().regex(/^#[0-9a-f]{6}$/i),
    showGrid: z.boolean(),
  }),
  terrain: z.object({
    visible: z.boolean(),
    seed: z.number().int().min(0).max(2_147_483_647),
    contourInterval: z.number().positive(),
    opacity: z.number().min(0).max(1),
  }),
  waypoints: z.array(trailWaypointSchema).min(2),
  routes: z.array(trailRouteSchema),
  icons: z.array(
    z.object({
      id: idSchema,
      iconId: z.string().min(1),
      x: z.number().finite(),
      y: z.number().finite(),
      scale: z.number().positive(),
      rotation: z.number().min(-360).max(360),
      visible: z.boolean().default(true),
    }),
  ),
  iconAssets: z.array(iconAssetSchema).default([]),
  scatter: z.array(trailScatterSchema).default([]),
});

export const projectSchema = z
  .discriminatedUnion("kind", [travelProjectSchema, trailProjectSchema])
  .superRefine((project, context) => {
    const objectIds = new Set<string>();

    const objects =
      project.kind === "travel"
        ? [...project.stops, ...project.legs, ...project.symbols, ...project.scatter, ...project.boundaries]
        : [...project.waypoints, ...project.routes, ...project.icons, ...project.scatter];

    for (const object of objects) {
      if (objectIds.has(object.id)) {
        context.addIssue({
          code: "custom",
          message: `Object ID '${object.id}' is duplicated`,
          path: [project.kind === "travel" ? "legs" : "routes"],
        });
      }
      objectIds.add(object.id);
    }

    if (project.kind === "trail") {
      const waypointIds = new Set(project.waypoints.map((point) => point.id));
      const routeIds = new Set(project.routes.map((route) => route.id));
      for (const route of project.routes) {
        if (new Set(route.waypointIds).size < 2) {
          context.addIssue({
            code: "custom",
            message: `Trail route '${route.id}' must use at least two distinct waypoints`,
            path: ["routes"],
          });
        }
        const missing = route.waypointIds.find((id) => !waypointIds.has(id));
        if (missing) {
          context.addIssue({
            code: "custom",
            message: `Trail route '${route.id}' references missing waypoint '${missing}'`,
            path: ["routes"],
          });
        }
      }
      for (const scatter of project.scatter) {
        if (
          scatter.region.type === "around-waypoint" &&
          !waypointIds.has(scatter.region.waypointId)
        ) {
          context.addIssue({
            code: "custom",
            message: `Scatter '${scatter.id}' references a missing waypoint`,
            path: ["scatter"],
          });
        }
        if (
          scatter.region.type === "along-route" &&
          !routeIds.has(scatter.region.routeId)
        ) {
          context.addIssue({
            code: "custom",
            message: `Scatter '${scatter.id}' references a missing route`,
            path: ["scatter"],
          });
        }
      }
      return;
    }

    const stopIds = new Set(project.stops.map((stop) => stop.id));
    for (const leg of project.legs) {
      for (const endpoint of [leg.from, leg.to]) {
        if (!stopIds.has(endpoint)) {
          context.addIssue({
            code: "custom",
            message: `Travel leg '${leg.id}' references missing stop '${endpoint}'`,
            path: ["legs"],
          });
        }
      }

      if (leg.from === leg.to && !leg.loopback) {
        context.addIssue({
          code: "custom",
          message: `Travel leg '${leg.id}' must enable loopback to reuse one stop`,
          path: ["legs"],
        });
      }
    }
    const legIds = new Set(project.legs.map((leg) => leg.id));
    for (const scatter of project.scatter) {
      if (
        scatter.region.type === "around-stop" &&
        !stopIds.has(scatter.region.stopId)
      ) {
        context.addIssue({
          code: "custom",
          message: `Scatter '${scatter.id}' references a missing stop`,
          path: ["scatter"],
        });
      }
      if (
        scatter.region.type === "along-leg" &&
        !legIds.has(scatter.region.legId)
      ) {
        context.addIssue({
          code: "custom",
          message: `Scatter '${scatter.id}' references a missing travel leg`,
          path: ["scatter"],
        });
      }
      if (
        scatter.region.type === "bounds" &&
        (scatter.region.west >= scatter.region.east ||
          scatter.region.south >= scatter.region.north)
      ) {
        context.addIssue({
          code: "custom",
          message: `Scatter '${scatter.id}' has invalid bounds`,
          path: ["scatter"],
        });
      }
    }
  });

export type MapperProject = z.infer<typeof projectSchema>;
export type TravelProject = z.infer<typeof travelProjectSchema>;
export type TrailProject = z.infer<typeof trailProjectSchema>;
export type TravelStop = z.infer<typeof stopSchema>;
export type TravelLeg = z.infer<typeof travelLegSchema>;
export type LegStyle = z.infer<typeof legStyleSchema>;
export type Coordinate = z.infer<typeof coordinateSchema>;
export type TrailNoise = z.infer<typeof trailNoiseSchema>;
export type TrailRoute = z.infer<typeof trailRouteSchema>;
export type IconAsset = z.infer<typeof iconAssetSchema>;
export type TravelScatter = z.infer<typeof travelScatterSchema>;
export type TrailScatter = z.infer<typeof trailScatterSchema>;
export type PresentationSettings = z.infer<typeof presentationSchema>;
export type BoundaryAsset = z.infer<typeof boundaryAssetSchema>;

const legacyStopIcons: Record<string, string> = {
  city: "carbon-hotel",
  temple: "carbon-restaurant",
  mountain: "carbon-mountain",
  airport: "carbon-airport",
  lake: "carbon-tree",
  camp: "carbon-campsite",
  viewpoint: "carbon-mountain",
};

function cleanLegacyProject(input: unknown) {
  if (!input || typeof input !== "object") return input;
  const project = structuredClone(input) as Record<string, unknown>;
  const removeExpandedScatter = (items: unknown[]) => {
    const groups = new Map<string, Array<{ id: string; index: number; timestamp: number }>>();
    for (const item of items) {
      if (!item || typeof item !== "object") continue;
      const record = item as Record<string, unknown>;
      if (typeof record.id !== "string" || typeof record.iconId !== "string") continue;
      const match = /^scatter-(\d+)-(\d+)$/.exec(record.id);
      if (!match) continue;
      const group = groups.get(record.iconId) ?? [];
      group.push({ id: record.id, timestamp: Number(match[1]), index: Number(match[2]) });
      groups.set(record.iconId, group);
    }
    const legacyIds = new Set<string>();
    for (const entries of groups.values()) {
      entries.sort((a, b) => a.timestamp - b.timestamp);
      let batch: typeof entries = [];
      const finishBatch = () => {
        if (
          batch.length >= 3 &&
          batch.every((entry, index) => entry.index === index) &&
          batch[batch.length - 1].timestamp - batch[0].timestamp < 60_000
        ) {
          batch.forEach((entry) => legacyIds.add(entry.id));
        }
      };
      for (const entry of entries) {
        if (entry.index === 0) {
          finishBatch();
          batch = [entry];
        } else {
          batch.push(entry);
        }
      }
      finishBatch();
    }
    return items.filter((item) => {
      if (!item || typeof item !== "object") return true;
      return !legacyIds.has(String((item as Record<string, unknown>).id));
    });
  };

  if (project.kind === "travel" && Array.isArray(project.symbols)) {
    project.symbols = removeExpandedScatter(project.symbols);
  }
  if (project.kind === "trail" && Array.isArray(project.icons)) {
    project.icons = removeExpandedScatter(project.icons);
  }
  if (project.kind === "travel" && Array.isArray(project.stops)) {
    const customIconIds = new Set(
      Array.isArray(project.iconAssets)
        ? project.iconAssets.flatMap((asset) =>
            asset && typeof asset === "object" && typeof (asset as Record<string, unknown>).id === "string"
              ? [(asset as Record<string, unknown>).id as string]
              : [],
          )
        : [],
    );
    project.stops = project.stops.map((stop) => {
      if (!stop || typeof stop !== "object") return stop;
      const nextStop = { ...(stop as Record<string, unknown>) };
      if (
        typeof nextStop.icon === "string" &&
        !customIconIds.has(nextStop.icon) &&
        legacyStopIcons[nextStop.icon]
      ) {
        nextStop.icon = legacyStopIcons[nextStop.icon];
      }
      return nextStop;
    });
  }
  return project;
}

export function parseProject(input: unknown): MapperProject {
  return projectSchema.parse(cleanLegacyProject(input));
}
