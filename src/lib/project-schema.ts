import { z } from "zod";

const idSchema = z
  .string()
  .min(1)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase kebab-case IDs");

const baseLayerSchema = z.object({
  id: idSchema,
  name: z.string().trim().min(1).max(80),
  visible: z.boolean().default(true),
  locked: z.boolean().default(false),
});

export const waypointLayerSchema = baseLayerSchema.extend({
  type: z.literal("waypoints"),
  points: z
    .array(
      z.object({
        id: idSchema,
        name: z.string().trim().min(1).max(80),
        x: z.number().finite(),
        y: z.number().finite(),
        elevation: z.number().finite().optional(),
      }),
    )
    .min(1),
});

export const routeNoiseSchema = z.object({
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

export const routeLayerSchema = baseLayerSchema.extend({
  type: z.literal("route"),
  mode: z.enum(["joined", "segments"]),
  waypointLayerId: idSchema,
  waypointIds: z.array(idSchema).min(2),
  noise: routeNoiseSchema,
});

export const contourLayerSchema = baseLayerSchema.extend({
  type: z.literal("contours"),
  seed: z.number().int().min(0).max(2_147_483_647),
  interval: z.number().positive(),
  resolution: z.number().int().min(16).max(1024),
  opacity: z.number().min(0).max(1),
});

export const scatterLayerSchema = baseLayerSchema.extend({
  type: z.literal("scatter"),
  iconId: z.string().min(1),
  seed: z.number().int().min(0).max(2_147_483_647),
  count: z.number().int().min(1).max(10_000),
  scaleMin: z.number().positive(),
  scaleMax: z.number().positive(),
});

export const iconLayerSchema = baseLayerSchema.extend({
  type: z.literal("icon"),
  iconId: z.string().min(1),
  x: z.number().finite(),
  y: z.number().finite(),
  scale: z.number().positive(),
  rotation: z.number().min(-360).max(360),
});

export const layerSchema = z.discriminatedUnion("type", [
  waypointLayerSchema,
  routeLayerSchema,
  contourLayerSchema,
  scatterLayerSchema,
  iconLayerSchema,
]);

export const projectSchema = z
  .object({
    version: z.literal(1),
    id: idSchema,
    name: z.string().trim().min(1).max(120),
    units: z.enum(["m", "ft", "abstract"]),
    canvas: z.object({
      width: z.number().positive().max(100_000),
      height: z.number().positive().max(100_000),
      background: z.string().regex(/^#[0-9a-f]{6}$/i),
      showGrid: z.boolean(),
    }),
    layers: z.array(layerSchema),
  })
  .superRefine((project, context) => {
    const ids = new Set<string>();

    for (const layer of project.layers) {
      if (ids.has(layer.id)) {
        context.addIssue({
          code: "custom",
          message: `Layer ID '${layer.id}' is duplicated`,
          path: ["layers"],
        });
      }
      ids.add(layer.id);
    }

    for (const layer of project.layers) {
      if (layer.type !== "route") continue;

      const waypointLayer = project.layers.find(
        (candidate) =>
          candidate.id === layer.waypointLayerId &&
          candidate.type === "waypoints",
      );

      if (!waypointLayer || waypointLayer.type !== "waypoints") {
        context.addIssue({
          code: "custom",
          message: `Route '${layer.id}' references a missing waypoint layer`,
          path: ["layers"],
        });
        continue;
      }

      const waypointIds = new Set(
        waypointLayer.points.map((waypoint) => waypoint.id),
      );
      const missing = layer.waypointIds.find((id) => !waypointIds.has(id));

      if (missing) {
        context.addIssue({
          code: "custom",
          message: `Route '${layer.id}' references missing waypoint '${missing}'`,
          path: ["layers"],
        });
      }
    }
  });

export type MapperProject = z.infer<typeof projectSchema>;
export type MapperLayer = z.infer<typeof layerSchema>;
export type RouteLayer = z.infer<typeof routeLayerSchema>;
export type RouteNoise = z.infer<typeof routeNoiseSchema>;

export function parseProject(input: unknown): MapperProject {
  return projectSchema.parse(input);
}
