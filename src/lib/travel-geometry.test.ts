import { describe, expect, it } from "vitest";

import { sampleProject } from "@/data/sample-project";
import {
  buildTravelLegsGeoJson,
  getLegCoordinates,
} from "@/lib/travel-geometry";

describe("travel geometry", () => {
  it("locks generated geometry to its stop coordinates", () => {
    const leg = sampleProject.legs[2];
    const coordinates = getLegCoordinates(sampleProject, leg);
    const start = sampleProject.stops.find((stop) => stop.id === leg.from);
    const end = sampleProject.stops.find((stop) => stop.id === leg.to);

    expect(coordinates[0]).toEqual(start?.coordinates);
    expect(coordinates.at(-1)).toEqual(end?.coordinates);
  });

  it("omits hidden legs and marks the selected leg", () => {
    const project = structuredClone(sampleProject);
    project.legs[0].visible = false;
    const data = buildTravelLegsGeoJson(project, project.legs[1].id);

    expect(data.features).toHaveLength(project.legs.length - 1);
    expect(data.features.find((feature) => feature.properties.selected)).toBeTruthy();
  });
});
