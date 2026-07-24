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
  icon: z.enum([
    "city",
    "temple",
    "mountain",
    "airport",
    "lake",
    "camp",
    "viewpoint",
  ]),
  elevation: z.number().finite().optional(),
  visible: z.boolean().default(true),
});

export const legStyleSchema = z.object({
  line: z.enum(["solid", "dashed"]),
  curvature: z.number().min(-1).max(1),
  winding: z.number().min(0).max(1),
  color: z.string().regex(/^#[0-9a-f]{6}$/i),
});

export const travelLegSchema = z.object({
  id: idSchema,
  name: z.string().trim().min(1).max(100),
  from: idSchema,
  to: idSchema,
  mode: z.enum(["walk", "drive", "flight", "train", "boat"]),
  via: z.array(coordinateSchema).max(100).default([]),
  style: legStyleSchema,
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
    map: z.object({
      style: z.enum(["positron", "liberty", "bright"]),
      showContours: z.boolean(),
      showHillshade: z.boolean(),
      contourInterval: z.number().int().min(10).max(1_000),
      elevationUnits: z.enum(["m", "ft"]),
    }),
    stops: z.array(stopSchema).min(2),
    legs: z.array(travelLegSchema),
  });

const trailProjectSchema = z.object({
  version: z.literal(2),
  kind: z.literal("trail"),
  id: idSchema,
  name: z.string().trim().min(1).max(120),
  units: z.enum(["m", "ft", "abstract"]),
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
});

export const projectSchema = z
  .discriminatedUnion("kind", [travelProjectSchema, trailProjectSchema])
  .superRefine((project, context) => {
    const objectIds = new Set<string>();

    const objects =
      project.kind === "travel"
        ? [...project.stops, ...project.legs]
        : [...project.waypoints, ...project.routes, ...project.icons];

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

      if (leg.from === leg.to) {
        context.addIssue({
          code: "custom",
          message: `Travel leg '${leg.id}' must connect two different stops`,
          path: ["legs"],
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

export function parseProject(input: unknown): MapperProject {
  return projectSchema.parse(input);
}
