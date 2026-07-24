import { describe, expect, it } from "vitest";

import { sampleProject } from "@/data/sample-project";
import { parseProject, projectSchema } from "@/lib/project-schema";

describe("project schema", () => {
  it("accepts the versioned sample project", () => {
    expect(parseProject(sampleProject)).toEqual(sampleProject);
  });

  it("rejects a route that references a missing waypoint", () => {
    const invalidProject = structuredClone(sampleProject);
    const route = invalidProject.layers.find((layer) => layer.type === "route");

    if (route?.type === "route") {
      route.waypointIds.push("missing-place");
    }

    const result = projectSchema.safeParse(invalidProject);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain("missing-place");
    }
  });

  it("rejects duplicate layer IDs", () => {
    const invalidProject = structuredClone(sampleProject);
    invalidProject.layers[1].id = invalidProject.layers[0].id;

    expect(projectSchema.safeParse(invalidProject).success).toBe(false);
  });
});
