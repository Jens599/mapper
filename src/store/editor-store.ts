"use client";

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

import { sampleProject } from "@/data/sample-project";
import { sampleTrailProject } from "@/data/sample-trail-project";
import type {
  IconAsset,
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
  selectedIconId: string;
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
  selectIcon: (iconId: string) => void;
  addIconAssets: (assets: IconAsset[]) => void;
  placeSelectedIcon: () => void;
  scatterSelectedIcon: (count: number) => void;
  updateSymbolTransform: (
    id: string,
    key: "scale" | "rotation",
    value: number,
  ) => void;
};

export const useEditorStore = create<EditorState>()(
  immer((set) => ({
    project: sampleProject,
    travelProject: sampleProject,
    trailProject: sampleTrailProject,
    selectedObjectId: "leg-kathmandu-pokhara",
    selectedIconId: "carbon-mountain",
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
          if (leg) {
            leg.visible = !leg.visible;
            return;
          }
          const symbol = state.project.symbols.find((item) => item.id === id);
          if (symbol) symbol.visible = !symbol.visible;
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
    selectIcon: (iconId) => {
      set((state) => {
        state.selectedIconId = iconId;
      });
    },
    addIconAssets: (assets) => {
      set((state) => {
        state.project.iconAssets.push(...assets);
      });
    },
    placeSelectedIcon: () => {
      set((state) => {
        const id = `symbol-${Date.now()}`;
        if (state.project.kind === "travel") {
          const longitude =
            state.project.stops.reduce((sum, stop) => sum + stop.coordinates[0], 0) /
            state.project.stops.length;
          const latitude =
            state.project.stops.reduce((sum, stop) => sum + stop.coordinates[1], 0) /
            state.project.stops.length;
          state.project.symbols.push({
            id,
            iconId: state.selectedIconId,
            coordinates: [longitude, latitude],
            scale: 1,
            rotation: 0,
            visible: true,
          });
        } else {
          state.project.icons.push({
            id,
            iconId: state.selectedIconId,
            x: state.project.canvas.width / 2,
            y: state.project.canvas.height / 2,
            scale: 1,
            rotation: 0,
            visible: true,
          });
        }
        state.selectedObjectId = id;
      });
    },
    scatterSelectedIcon: (count) => {
      set((state) => {
        let seed = 7_919;
        const random = () => {
          seed = (seed * 1_664_525 + 1_013_904_223) % 4_294_967_296;
          return seed / 4_294_967_296;
        };
        for (let index = 0; index < count; index += 1) {
          const id = `scatter-${Date.now()}-${index}`;
          if (state.project.kind === "travel") {
            const longitudes = state.project.stops.map((stop) => stop.coordinates[0]);
            const latitudes = state.project.stops.map((stop) => stop.coordinates[1]);
            const minX = Math.min(...longitudes);
            const maxX = Math.max(...longitudes);
            const minY = Math.min(...latitudes);
            const maxY = Math.max(...latitudes);
            state.project.symbols.push({
              id,
              iconId: state.selectedIconId,
              coordinates: [minX + random() * (maxX - minX), minY + random() * (maxY - minY)],
              scale: 0.65 + random() * 0.7,
              rotation: -20 + random() * 40,
              visible: true,
            });
          } else {
            state.project.icons.push({
              id,
              iconId: state.selectedIconId,
              x: random() * state.project.canvas.width,
              y: random() * state.project.canvas.height,
              scale: 0.65 + random() * 0.7,
              rotation: -20 + random() * 40,
              visible: true,
            });
          }
        }
      });
    },
    updateSymbolTransform: (id, key, value) => {
      set((state) => {
        const symbols =
          state.project.kind === "travel"
            ? state.project.symbols
            : state.project.icons;
        const symbol = symbols.find((item) => item.id === id);
        if (symbol) Object.assign(symbol, { [key]: value });
      });
    },
  })),
);
