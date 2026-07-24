"use client";

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

import { sampleProject } from "@/data/sample-project";
import { sampleTrailProject } from "@/data/sample-trail-project";
import type {
  LegStyle,
  MapperProject,
  TrailNoise,
  TrailProject,
  TravelProject,
} from "@/lib/project-schema";

type EditorState = {
  project: MapperProject;
  travelProject: TravelProject;
  trailProject: TrailProject;
  selectedObjectId: string | null;
  switchProjectMode: (kind: MapperProject["kind"]) => void;
  replaceProject: (project: MapperProject) => void;
  selectObject: (id: string) => void;
  toggleObjectVisibility: (id: string) => void;
  toggleContours: () => void;
  toggleHillshade: () => void;
  updateLegStyle: <Key extends keyof LegStyle>(
    legId: string,
    key: Key,
    value: LegStyle[Key],
  ) => void;
  updateTrailNoise: <Key extends keyof TrailNoise>(
    routeId: string,
    key: Key,
    value: TrailNoise[Key],
  ) => void;
};

export const useEditorStore = create<EditorState>()(
  immer((set) => ({
    project: sampleProject,
    travelProject: sampleProject,
    trailProject: sampleTrailProject,
    selectedObjectId: "leg-kathmandu-pokhara",
    switchProjectMode: (kind) => {
      set((state) => {
        if (state.project.kind === kind) return;
        if (state.project.kind === "travel") state.travelProject = state.project;
        else state.trailProject = state.project;
        state.project = kind === "travel" ? state.travelProject : state.trailProject;
        state.selectedObjectId =
          kind === "travel" ? "leg-kathmandu-pokhara" : "ridge-route";
      });
    },
    replaceProject: (project) => {
      set((state) => {
        state.project = project;
        if (project.kind === "travel") state.travelProject = project;
        else state.trailProject = project;
        state.selectedObjectId =
          project.kind === "travel"
            ? (project.legs[0]?.id ?? project.stops[0]?.id ?? null)
            : (project.routes[0]?.id ?? project.waypoints[0]?.id ?? null);
      });
    },
    selectObject: (id) => {
      set((state) => {
        state.selectedObjectId = id;
      });
    },
    toggleObjectVisibility: (id) => {
      set((state) => {
        if (state.project.kind === "travel") {
          const stop = state.project.stops.find((item) => item.id === id);
          if (stop) {
            stop.visible = !stop.visible;
            return;
          }
          const leg = state.project.legs.find((item) => item.id === id);
          if (leg) leg.visible = !leg.visible;
          return;
        }

        const waypoint = state.project.waypoints.find((item) => item.id === id);
        if (waypoint) {
          waypoint.visible = !waypoint.visible;
          return;
        }
        const route = state.project.routes.find((item) => item.id === id);
        if (route) {
          route.visible = !route.visible;
          return;
        }
        const icon = state.project.icons.find((item) => item.id === id);
        if (icon) icon.visible = !icon.visible;
      });
    },
    toggleContours: () => {
      set((state) => {
        if (state.project.kind === "travel") {
          state.project.map.showContours = !state.project.map.showContours;
        } else {
          state.project.terrain.visible = !state.project.terrain.visible;
        }
      });
    },
    toggleHillshade: () => {
      set((state) => {
        if (state.project.kind !== "travel") return;
        state.project.map.showHillshade = !state.project.map.showHillshade;
      });
    },
    updateLegStyle: (legId, key, value) => {
      set((state) => {
        if (state.project.kind !== "travel") return;
        const leg = state.project.legs.find((item) => item.id === legId);
        if (leg) Object.assign(leg.style, { [key]: value });
      });
    },
    updateTrailNoise: (routeId, key, value) => {
      set((state) => {
        if (state.project.kind !== "trail") return;
        const route = state.project.routes.find((item) => item.id === routeId);
        if (route) Object.assign(route.noise, { [key]: value });
      });
    },
  })),
);
