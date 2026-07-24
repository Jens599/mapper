"use client";

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

import { sampleProject } from "@/data/sample-project";
import { sampleTrailProject } from "@/data/sample-trail-project";
import type {
  IconAsset,
  LegStyle,
  MapperProject,
  PresentationSettings,
  TrailNoise,
  TrailProject,
  TravelProject,
} from "@/lib/project-schema";

export type ScatterOptions = {
  count: number;
  seed: number;
  region: "whole" | "top" | "selected";
  minSpacing: number;
  scaleMin: number;
  scaleMax: number;
  rotationMin: number;
  rotationMax: number;
};

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
  setTravelDisplay: (display: "geographic" | "symbolic") => void;
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
  scatterSelectedIcon: (options: ScatterOptions) => void;
  updateSymbolTransform: (
    id: string,
    key: "scale" | "rotation",
    value: number,
  ) => void;
  updatePresentation: (
    key: keyof PresentationSettings,
    value: number,
  ) => void;
  updateStopLabelOffset: (id: string, axis: 0 | 1, value: number) => void;
  moveTravelStop: (id: string, coordinates: [number, number]) => void;
  moveTravelSymbol: (id: string, coordinates: [number, number]) => void;
  moveSymbolicStop: (id: string, position: { x: number; y: number }) => void;
  moveSymbolicSymbol: (id: string, position: { x: number; y: number }) => void;
  moveTrailObject: (id: string, position: { x: number; y: number }) => void;
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
          if (symbol) {
            symbol.visible = !symbol.visible;
            return;
          }
          const scatter = state.project.scatter.find((item) => item.id === id);
          if (scatter) scatter.visible = !scatter.visible;
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
        if (icon) {
          icon.visible = !icon.visible;
          return;
        }
        const scatter = state.project.scatter.find((item) => item.id === id);
        if (scatter) scatter.visible = !scatter.visible;
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
    setTravelDisplay: (display) => {
      set((state) => {
        if (state.project.kind === "travel") {
          state.project.map.display = display;
        }
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
    scatterSelectedIcon: (options) => {
      set((state) => {
        const id = `scatter-${Date.now()}`;
        const appearance = {
          scale: [
            Math.min(10, Math.max(0.1, options.scaleMin)),
            Math.min(10, Math.max(0.1, options.scaleMax)),
          ] as [number, number],
          rotation: [options.rotationMin, options.rotationMax] as [number, number],
        };
        const seed = Math.min(2_147_483_647, Math.max(0, Math.round(options.seed)));
        const count = Math.min(2_000, Math.max(1, Math.round(options.count)));
        if (state.project.kind === "travel") {
          const selectedStop = state.project.stops.find(
            (item) => item.id === state.selectedObjectId,
          );
          const selectedLeg = state.project.legs.find(
            (item) => item.id === state.selectedObjectId,
          );
          const region =
            options.region === "top"
              ? ({ type: "map-edge", edge: "north", band: 0.18, padding: 0.05 } as const)
              : options.region === "selected" && selectedStop
                ? ({ type: "around-stop", stopId: selectedStop.id, radiusKm: 25 } as const)
                : options.region === "selected" && selectedLeg
                  ? ({ type: "along-leg", legId: selectedLeg.id, corridorKm: 10 } as const)
                  : ({ type: "trip-bounds", padding: 0.08 } as const);
          state.project.scatter.push({
            id,
            name: `${state.selectedIconId} scatter`,
            iconId: state.selectedIconId,
            seed,
            count,
            minSpacingKm: Math.min(500, Math.max(0, options.minSpacing)),
            region,
            appearance,
            visible: true,
          });
        } else {
          const selectedWaypoint = state.project.waypoints.find(
            (item) => item.id === state.selectedObjectId,
          );
          const selectedRoute = state.project.routes.find(
            (item) => item.id === state.selectedObjectId,
          );
          const region =
            options.region === "top"
              ? ({ type: "canvas-edge", edge: "top", band: 0.18, padding: 20 } as const)
              : options.region === "selected" && selectedWaypoint
                ? ({ type: "around-waypoint", waypointId: selectedWaypoint.id, radius: 140 } as const)
                : options.region === "selected" && selectedRoute
                  ? ({ type: "along-route", routeId: selectedRoute.id, corridor: 60 } as const)
                  : ({ type: "canvas", padding: 20 } as const);
          state.project.scatter.push({
            id,
            name: `${state.selectedIconId} scatter`,
            iconId: state.selectedIconId,
            seed,
            count,
            minSpacing: Math.min(1_000, Math.max(0, options.minSpacing)),
            region,
            appearance,
            visible: true,
          });
        }
        state.selectedObjectId = id;
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
    updatePresentation: (key, value) => {
      set((state) => {
        state.project.presentation[key] = value;
      });
    },
    updateStopLabelOffset: (id, axis, value) => {
      set((state) => {
        if (state.project.kind !== "travel") return;
        const stop = state.project.stops.find((item) => item.id === id);
        if (stop) stop.labelOffset[axis] = value;
      });
    },
    moveTravelStop: (id, coordinates) => {
      set((state) => {
        if (state.project.kind !== "travel") return;
        const stop = state.project.stops.find((item) => item.id === id);
        if (stop) {
          stop.coordinates = [
            ((coordinates[0] + 180) % 360 + 360) % 360 - 180,
            Math.min(90, Math.max(-90, coordinates[1])),
          ];
        }
      });
    },
    moveTravelSymbol: (id, coordinates) => {
      set((state) => {
        if (state.project.kind !== "travel") return;
        const symbol = state.project.symbols.find((item) => item.id === id);
        if (symbol) {
          symbol.coordinates = [
            ((coordinates[0] + 180) % 360 + 360) % 360 - 180,
            Math.min(90, Math.max(-90, coordinates[1])),
          ];
        }
      });
    },
    moveSymbolicStop: (id, position) => {
      set((state) => {
        if (state.project.kind !== "travel") return;
        const stop = state.project.stops.find((item) => item.id === id);
        if (stop) stop.diagramPosition = position;
      });
    },
    moveSymbolicSymbol: (id, position) => {
      set((state) => {
        if (state.project.kind !== "travel") return;
        const symbol = state.project.symbols.find((item) => item.id === id);
        if (symbol) symbol.diagramPosition = position;
      });
    },
    moveTrailObject: (id, position) => {
      set((state) => {
        if (state.project.kind !== "trail") return;
        const waypoint = state.project.waypoints.find((item) => item.id === id);
        if (waypoint) {
          waypoint.x = position.x;
          waypoint.y = position.y;
          return;
        }
        const icon = state.project.icons.find((item) => item.id === id);
        if (icon) {
          icon.x = position.x;
          icon.y = position.y;
        }
      });
    },
  })),
);
