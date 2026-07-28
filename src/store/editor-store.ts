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
  TravelStop,
  TravelLeg,
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

export type NewTravelStop = {
  name: string;
  dayLabel: string;
  coordinates: [number, number];
};

export type NewTravelLeg = {
   name: string;
   from: string;
   to: string;
   mode: TravelProject["legs"][number]["mode"];
   loopback?: boolean;
   iconId?: string;
 };

export type TravelStopUpdate = Partial<
  Pick<TravelProject["stops"][number], "name" | "dayLabel" | "coordinates" | "elevation" | "labelAnchor" | "labelStyle" | "pointStyle">
>;

export type TravelLegUpdate = Partial<
  Pick<TravelProject["legs"][number], "name" | "from" | "to" | "mode" | "loopback" | "showDayLabel">
>;

type EditorState = {
   project: MapperProject;
   travelProject: TravelProject;
   trailProject: TrailProject;
   selectedObjectId: string | null;
   selectedIds: string[];
   selectedIconId: string;
   switchProjectMode: (kind: MapperProject["kind"]) => void;
   replaceProject: (project: MapperProject) => void;
   selectObject: (id: string) => void;
   selectObjects: (ids: string[]) => void;
   toggleObjectSelection: (id: string) => void;
   clearSelection: () => void;
   toggleObjectVisibility: (id: string) => void;
   toggleContours: () => void;
   toggleHillshade: () => void;
   setTravelDisplay: (display: "geographic" | "symbolic") => void;
   setMapStyle: (style: TravelProject["map"]["style"]) => void;
   addTravelStop: (stop: NewTravelStop) => void;
   addTravelLeg: (leg: NewTravelLeg) => void;
   updateTravelStop: (id: string, update: TravelStopUpdate) => void;
   updateTravelLeg: (id: string, update: TravelLegUpdate) => void;
    updateLegIcon: (legId: string, iconId: string | undefined) => void;
   updateLegStyle: <Key extends keyof LegStyle>(
     legId: string,
     key: Key,
     value: LegStyle[Key],
   ) => void;
   applyLegShapeToAll: (legId: string) => void;
   updatePointIcon: (id: string, iconId: string | null) => void;
   updateTrailNoise: <Key extends keyof TrailNoise>(
     routeId: string,
     key: Key,
     value: TrailNoise[Key],
   ) => void;
   selectIcon: (iconId: string) => void;
   addIconAssets: (assets: IconAsset[]) => void;
   placeSelectedIcon: () => void;
   placePOISymbol: (coordinates: [number, number]) => void;
   scatterSelectedIcon: (options: ScatterOptions) => void;
   updateSymbolTransform: (
     id: string,
     key: "scale" | "rotation",
     value: number,
   ) => void;
    updatePresentation: (
      key: keyof PresentationSettings,
      value: number | boolean,
    ) => void;
   resetPresentation: () => void;
   resetSymbolicLayout: () => void;
   updateStopLabelOffset: (id: string, axis: 0 | 1, value: number) => void;
   updateStopLabelStyle: (id: string, key: keyof NonNullable<TravelStop["labelStyle"]>, value: number | string | boolean) => void;
   moveTravelStop: (id: string, coordinates: [number, number]) => void;
   moveTravelSymbol: (id: string, coordinates: [number, number]) => void;
   moveSymbolicStop: (id: string, position: { x: number; y: number }) => void;
   moveSymbolicSymbol: (id: string, position: { x: number; y: number }) => void;
   moveTrailObject: (id: string, position: { x: number; y: number }) => void;
   moveTravelLegControl: (legId: string, curvature: number) => void;
   setMapBackground: (color: string) => void;
 };

export const useEditorStore = create<EditorState>()(
   immer((set) => ({
     project: sampleProject,
     travelProject: sampleProject,
     trailProject: sampleTrailProject,
     selectedObjectId: "leg-kathmandu-pokhara",
     selectedIds: [],
     selectedIconId: "carbon-mountain",
     switchProjectMode: (kind) => {
       set((state) => {
         if (state.project.kind === kind) return;
         if (state.project.kind === "travel") state.travelProject = state.project;
         else state.trailProject = state.project;
         state.project = kind === "travel" ? state.travelProject : state.trailProject;
         state.selectedObjectId =
           kind === "travel" ? "leg-kathmandu-pokhara" : "ridge-route";
         state.selectedIds = [];
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
         state.selectedIds = [];
       });
     },
     selectObject: (id) => {
       set((state) => {
         state.selectedObjectId = id;
         state.selectedIds = [id];
       });
     },
     selectObjects: (ids) => {
       set((state) => {
         state.selectedIds = ids;
         state.selectedObjectId = ids[0] ?? null;
       });
     },
     toggleObjectSelection: (id) => {
       set((state) => {
         const idx = state.selectedIds.indexOf(id);
         if (idx >= 0) {
           state.selectedIds.splice(idx, 1);
           state.selectedObjectId = state.selectedIds[0] ?? null;
         } else {
           state.selectedIds.push(id);
           state.selectedObjectId = id;
         }
       });
     },
     clearSelection: () => {
       set((state) => {
         state.selectedIds = [];
         state.selectedObjectId = null;
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
    setMapStyle: (style) => {
      set((state) => {
        if (state.project.kind === "travel") state.project.map.style = style;
      });
    },
    addTravelStop: (stop) => {
      set((state) => {
        if (
          state.project.kind !== "travel" ||
          !stop.name.trim() ||
          !stop.dayLabel.trim() ||
          !stop.coordinates.every(Number.isFinite)
        ) return;
        const id = `stop-${Date.now()}`;
        state.project.stops.push({
          id,
          name: stop.name.trim().slice(0, 80),
          dayLabel: stop.dayLabel.trim().slice(0, 24),
          coordinates: [
            ((stop.coordinates[0] + 180) % 360 + 360) % 360 - 180,
            Math.min(90, Math.max(-90, stop.coordinates[1])),
          ],
          icon: "carbon-hotel",
          labelOffset: [0, 0],
          labelAnchor: "auto",
          labelStyle: { fontSize: 1, color: "#18221d", bold: true },
          pointStyle: { fill: "#e9efeb", showFill: true, stroke: "#18221d", showStroke: true, strokeWidth: 2.5 },
          visible: true,
        });
        state.selectedObjectId = id;
      });
    },
    addTravelLeg: (leg) => {
      set((state) => {
        if (
          state.project.kind !== "travel" ||
          (leg.from === leg.to && !leg.loopback) ||
          !leg.name.trim()
        ) return;
        const stopIds = new Set(state.project.stops.map((stop) => stop.id));
        if (!stopIds.has(leg.from) || !stopIds.has(leg.to)) return;
        const id = `leg-${Date.now()}`;
         state.project.legs.push({
           id,
           name: leg.name.trim().slice(0, 100),
           from: leg.from,
           to: leg.to,
           mode: leg.mode,
           loopback: Boolean(leg.loopback),
           showDayLabel: false,
            iconId: leg.iconId,
           via: [],
           style: {
             line: leg.mode === "drive" || leg.mode === "train" ? "solid" : "dashed",
             curvature: leg.mode === "flight" ? 0.24 : 0.06,
             winding: leg.mode === "walk" ? 0.3 : 0,
             noiseSeed: 42,
             noiseAmplitude: 0,
             noiseScale: 2,
             noiseOctaves: 3,
             noiseModulation: 0,
             color: leg.mode === "flight" ? "#216b8b" : leg.mode === "walk" ? "#ad4a24" : "#202b25",
           },
           visible: true,
         });
        state.selectedObjectId = id;
      });
    },
    updateTravelStop: (id, update) => {
      set((state) => {
        if (state.project.kind !== "travel") return;
        const stop = state.project.stops.find((item) => item.id === id);
        if (!stop) return;
        if (update.name?.trim()) stop.name = update.name.trim().slice(0, 80);
        if (update.dayLabel?.trim()) stop.dayLabel = update.dayLabel.trim().slice(0, 24);
        if (update.coordinates?.every(Number.isFinite)) {
          stop.coordinates = [
            ((update.coordinates[0] + 180) % 360 + 360) % 360 - 180,
            Math.min(90, Math.max(-90, update.coordinates[1])),
          ];
        }
        if ("elevation" in update) stop.elevation = update.elevation;
        if (update.labelAnchor) stop.labelAnchor = update.labelAnchor;
        if (update.labelStyle) {
          if (!stop.labelStyle) stop.labelStyle = {} as typeof stop.labelStyle;
          Object.assign(stop.labelStyle, update.labelStyle);
        }
        if (update.pointStyle) {
          if (!stop.pointStyle) stop.pointStyle = {} as typeof stop.pointStyle;
          Object.assign(stop.pointStyle, update.pointStyle);
        }
      });
    },
    updateTravelLeg: (id, update) => {
      set((state) => {
        if (state.project.kind !== "travel") return;
        const leg = state.project.legs.find((item) => item.id === id);
        if (!leg) return;
        const from = update.from ?? leg.from;
        const to = update.to ?? leg.to;
        const loopback = update.loopback ?? leg.loopback;
        const stopIds = new Set(state.project.stops.map((stop) => stop.id));
        if (!stopIds.has(from) || !stopIds.has(to) || (from === to && !loopback)) return;
        if (update.name?.trim()) leg.name = update.name.trim().slice(0, 100);
        leg.from = from;
        leg.to = to;
        leg.loopback = loopback;
        if (update.mode) {
          leg.mode = update.mode;
          const modeIcons: Record<string, string> = {
            walk: "carbon-tree",
            drive: "carbon-hotel",
            flight: "carbon-airport",
            train: "carbon-restaurant",
            boat: "carbon-campsite",
          };
          leg.iconId = modeIcons[update.mode] ?? leg.iconId;
        }
        if (update.showDayLabel !== undefined) leg.showDayLabel = update.showDayLabel;
      });
    },
    updateLegStyle: (legId, key, value) => {
      set((state) => {
        if (state.project.kind !== "travel") return;
        const leg = state.project.legs.find((item) => item.id === legId);
        if (leg) Object.assign(leg.style, { [key]: value });
      });
    },
    applyLegShapeToAll: (legId) => {
      set((state) => {
        if (state.project.kind !== "travel") return;
        const source = state.project.legs.find((leg) => leg.id === legId);
        if (!source) return;
        for (const leg of state.project.legs) {
          leg.style.curvature = source.style.curvature;
          leg.style.winding = source.style.winding;
          leg.style.noiseSeed = source.style.noiseSeed;
          leg.style.noiseAmplitude = source.style.noiseAmplitude;
          leg.style.noiseScale = source.style.noiseScale;
          leg.style.noiseOctaves = source.style.noiseOctaves;
          leg.style.noiseModulation = source.style.noiseModulation;
        }
      });
    },
    updatePointIcon: (id, iconId) => {
      set((state) => {
        if (state.project.kind === "travel") {
          const stop = state.project.stops.find((item) => item.id === id);
          if (stop && iconId) stop.icon = iconId;
          return;
        }
        const waypoint = state.project.waypoints.find((item) => item.id === id);
        if (waypoint) {
          if (iconId) waypoint.iconId = iconId;
          else delete waypoint.iconId;
        }
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
        (state.project.presentation as Record<string, number | boolean>)[key] = value;
      });
    },
    resetPresentation: () => {
      set((state) => {
        state.project.presentation = {
          lineScale: 1,
          textScale: 1,
          symbolScale: 1,
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
        };
      });
    },
    resetSymbolicLayout: () => {
      set((state) => {
        if (state.project.kind !== "travel") return;
        for (const stop of state.project.stops) delete stop.diagramPosition;
        for (const symbol of state.project.symbols) delete symbol.diagramPosition;
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
    moveTravelLegControl: (legId, curvature) => {
      set((state) => {
        if (state.project.kind !== "travel") return;
        const leg = state.project.legs.find((item) => item.id === legId);
        if (leg) leg.style.curvature = Math.min(10, Math.max(-10, curvature));
      });
    },
    updateLegIcon: (legId, iconId) => {
      set((state) => {
        if (state.project.kind !== "travel") return;
        const leg = state.project.legs.find((item) => item.id === legId);
        if (!leg) return;
        if (iconId) leg.iconId = iconId;
        else delete leg.iconId;
      });
    },
    updateStopLabelStyle: (id, key, value) => {
      set((state) => {
        if (state.project.kind !== "travel") return;
        const stop = state.project.stops.find((item) => item.id === id);
        if (stop) {
          if (key === "fontSize") stop.labelStyle.fontSize = value as number;
          else if (key === "color") stop.labelStyle.color = value as string;
          else if (key === "bold") stop.labelStyle.bold = value as boolean;
        }
      });
    },
    placePOISymbol: (coordinates) => {
      set((state) => {
        if (state.project.kind !== "travel") return;
        const id = `symbol-${Date.now()}`;
        state.project.symbols.push({
          id,
          iconId: state.selectedIconId,
          coordinates: [
            ((coordinates[0] + 180) % 360 + 360) % 360 - 180,
            Math.min(90, Math.max(-90, coordinates[1])),
          ],
          scale: 1,
          rotation: 0,
          visible: true,
        });
        state.selectedObjectId = id;
      });
    },
    setMapBackground: (color) => {
      set((state) => {
        if (state.project.kind === "travel") state.project.map.background = color;
      });
    },
  })),
);
