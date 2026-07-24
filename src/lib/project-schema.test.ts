import { describe, expect, it } from "vitest";

import { sampleProject } from "@/data/sample-project";
import { parseProject, projectSchema } from "@/lib/project-schema";

describe("travel project schema", () => {
  it("accepts the versioned sample trip", () => {
    expect(parseProject(sampleProject)).toEqual(sampleProject);
  });

  it("rejects a leg that references a missing stop", () => {
    const invalidProject = structuredClone(sampleProject);
    invalidProject.legs[0].to = "missing-place";

    const result = projectSchema.safeParse(invalidProject);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain("missing-place");
    }
  });

  it("rejects duplicate object IDs", () => {
    const invalidProject = structuredClone(sampleProject);
    invalidProject.legs[0].id = invalidProject.stops[0].id;

    expect(projectSchema.safeParse(invalidProject).success).toBe(false);
  });
});
