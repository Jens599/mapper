"use client";

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

import { sampleProject } from "@/data/sample-project";
import { sampleTrailProject } from "@/data/sample-trail-project";
import { mapperDebug } from "@/lib/debug";
import type {
  IconAsset,
  BoundaryAsset,
  LegStyle,
  MapperProject,
  PresentationSettings,
  TrailNoise,
  TrailProject,
  TravelProject,
  TravelStop,
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
  Pick<TravelProject["stops"][number], "name" | "dayLabel" | "coordinates" | "elevation" | "labelOffset" | "labelAnchor" | "labelStyle" | "pointStyle">
>;

export type TravelLegUpdate = Partial<
  Pick<TravelProject["legs"][number], "name" | "from" | "to" | "mode" | "loopback" | "showDayLabel">
>;

export type ProjectMetaUpdate = Partial<Pick<TravelProject, "name" | "subtitle" | "durationDays">>;
export type BoundaryUpdate = Partial<Pick<BoundaryAsset, "name" | "fill" | "stroke" | "opacity" | "visible">>;

type FormatClipboard =
  | {
      kind: "travel-stop";
      icon: TravelProject["stops"][number]["icon"];
      labelAnchor: TravelProject["stops"][number]["labelAnchor"];
      labelStyle: TravelProject["stops"][number]["labelStyle"];
      pointStyle: TravelProject["stops"][number]["pointStyle"];
    }
  | {
      kind: "travel-leg";
      showDayLabel: TravelProject["legs"][number]["showDayLabel"];
      iconId: TravelProject["legs"][number]["iconId"];
      style: TravelProject["legs"][number]["style"];
    }
  | {
      kind: "travel-symbol";
      iconId: TravelProject["symbols"][number]["iconId"];
      scale: TravelProject["symbols"][number]["scale"];
      rotation: TravelProject["symbols"][number]["rotation"];
    }
  | {
      kind: "travel-scatter";
      iconId: TravelProject["scatter"][number]["iconId"];
      appearance: TravelProject["scatter"][number]["appearance"];
    };

const defaultStopLabelStyle: TravelStop["labelStyle"] = {
  fontSize: 1,
  color: "#18221d",
  bold: true,
};

const defaultStopPointStyle: TravelStop["pointStyle"] = {
  fill: "#e9efeb",
  showFill: true,
  stroke: "#18221d",
  showStroke: true,
  strokeWidth: 2.5,
};

const defaultTravelLegStyle: LegStyle = {
  line: "solid",
  curvature: 0,
  winding: 0,
  noiseSeed: 42,
  noiseAmplitude: 0,
  noiseScale: 2,
  noiseOctaves: 3,
  noiseModulation: 0,
  color: "#202b25",
};

function ensureStopStyleDefaults(stop: TravelStop) {
  stop.labelOffset ??= [0, 0];
  stop.labelStyle = { ...defaultStopLabelStyle, ...stop.labelStyle };
  stop.pointStyle = { ...defaultStopPointStyle, ...stop.pointStyle };
}

function ensureLegStyleDefaults(leg: TravelProject["legs"][number]) {
  leg.style = { ...defaultTravelLegStyle, ...leg.style };
}

function readFormat(project: MapperProject, id: string | null): FormatClipboard | null {
  if (project.kind !== "travel" || !id) return null;
  const stop = project.stops.find((item) => item.id === id);
  if (stop) {
    const labelStyle = { ...defaultStopLabelStyle, ...stop.labelStyle };
    const pointStyle = { ...defaultStopPointStyle, ...stop.pointStyle };
    return {
      kind: "travel-stop",
      icon: stop.icon,
      labelAnchor: stop.labelAnchor,
      labelStyle: { ...labelStyle },
      pointStyle: { ...pointStyle },
    };
  }
  const leg = project.legs.find((item) => item.id === id);
  if (leg) {
    const style = { ...defaultTravelLegStyle, ...leg.style };
    return {
      kind: "travel-leg",
      showDayLabel: leg.showDayLabel,
      iconId: leg.iconId,
      style: { ...style },
    };
  }
  const symbol = project.symbols.find((item) => item.id === id);
  if (symbol) {
    return {
      kind: "travel-symbol",
      iconId: symbol.iconId,
      scale: symbol.scale,
      rotation: symbol.rotation,
    };
  }
  const scatter = project.scatter.find((item) => item.id === id);
  if (scatter) {
    const scale = scatter.appearance?.scale ?? [1, 1];
    const rotation = scatter.appearance?.rotation ?? [0, 0];
    return {
      kind: "travel-scatter",
      iconId: scatter.iconId,
      appearance: {
        scale: [scale[0], scale[1]],
        rotation: [rotation[0], rotation[1]],
      },
    };
  }
  return null;
}

function applyFormat(state: { project: MapperProject; formatClipboard: FormatClipboard | null }, id: string) {
  if (state.project.kind !== "travel" || !state.formatClipboard) return false;
  const format = state.formatClipboard;
  if (format.kind === "travel-stop") {
    const stop = state.project.stops.find((item) => item.id === id);
    if (!stop) return false;
    stop.icon = format.icon;
    stop.labelAnchor = format.labelAnchor;
    stop.labelStyle = { ...format.labelStyle };
    stop.pointStyle = { ...format.pointStyle };
    return true;
  }
  if (format.kind === "travel-leg") {
    const leg = state.project.legs.find((item) => item.id === id);
    if (!leg) return false;
    leg.showDayLabel = format.showDayLabel;
    leg.iconId = format.iconId;
    leg.style = { ...format.style };
    return true;
  }
  if (format.kind === "travel-symbol") {
    const symbol = state.project.symbols.find((item) => item.id === id);
    if (!symbol) return false;
    symbol.iconId = format.iconId;
    symbol.scale = format.scale;
    symbol.rotation = format.rotation;
    return true;
  }
  const scatter = state.project.scatter.find((item) => item.id === id);
  if (!scatter) return false;
  scatter.iconId = format.iconId;
  scatter.appearance = {
    scale: [format.appearance.scale[0], format.appearance.scale[1]],
    rotation: [format.appearance.rotation[0], format.appearance.rotation[1]],
  };
  return true;
}

type EditorState = {
   project: MapperProject;
   travelProject: TravelProject;
   trailProject: TrailProject;
    selectedObjectId: string | null;
    selectedIds: string[];
    selectedIconId: string;
    formatClipboard: FormatClipboard | null;
    formatPainterActive: boolean;
   switchProjectMode: (kind: MapperProject["kind"]) => void;
   replaceProject: (project: MapperProject) => void;
   selectObject: (id: string) => void;
   selectObjects: (ids: string[]) => void;
   toggleObjectSelection: (id: string) => void;
    clearSelection: () => void;
    deleteSelectedObjects: () => void;
    toggleObjectVisibility: (id: string) => void;
   toggleContours: () => void;
   toggleHillshade: () => void;
   setTravelDisplay: (display: "geographic" | "symbolic") => void;
    setMapStyle: (style: TravelProject["map"]["style"]) => void;
    updateProjectMeta: (update: ProjectMetaUpdate) => void;
    copySelectedFormat: () => void;
    applyFormatToObject: (id: string) => boolean;
    cancelFormatPainter: () => void;
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
    addBoundaryAsset: (boundary: BoundaryAsset) => void;
    updateBoundaryAsset: (id: string, update: BoundaryUpdate) => void;
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
      value: PresentationSettings[keyof PresentationSettings],
    ) => void;
   resetPresentation: () => void;
   resetSymbolicLayout: () => void;
   updateStopLabelOffset: (id: string, axis: 0 | 1, value: number) => void;
   updateStopLabelStyle: (id: string, key: keyof NonNullable<TravelStop["labelStyle"]>, value: number | string | boolean) => void;
   moveTravelStop: (id: string, coordinates: [number, number]) => void;
   moveTravelSymbol: (id: string, coordinates: [number, number]) => void;
    moveSymbolicStop: (id: string, position: { x: number; y: number }) => void;
    moveSymbolicSymbol: (id: string, position: { x: number; y: number }) => void;
    moveProjectTitle: (position: { x: number; y: number }) => void;
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
      formatClipboard: null,
      formatPainterActive: false,
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
          if (state.project.kind === "travel") {
            mapperDebug("selection", "selectObject", {
              id,
              previous: state.selectedObjectId,
              kind: state.project.kind,
              matches: {
                stop: state.project.stops.some((item) => item.id === id),
                leg: state.project.legs.some((item) => item.id === id),
                symbol: state.project.symbols.some((item) => item.id === id),
                scatter: state.project.scatter.some((item) => item.id === id),
                boundary: (state.project.boundaries ?? []).some((item) => item.id === id),
              },
              formatPainterActive: state.formatPainterActive,
            });
          } else {
            mapperDebug("selection", "selectObject", {
              id,
              previous: state.selectedObjectId,
              kind: state.project.kind,
              formatPainterActive: state.formatPainterActive,
            });
          }
          if (state.formatPainterActive && applyFormat(state, id)) {
            state.formatPainterActive = false;
          }
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
      deleteSelectedObjects: () => {
        set((state) => {
          const ids = new Set(state.selectedIds.length ? state.selectedIds : state.selectedObjectId ? [state.selectedObjectId] : []);
          ids.delete("terrain-context");
          ids.delete("trail-terrain");
          ids.delete("project-title");
          if (!ids.size) return;

          if (state.project.kind === "travel") {
            const stopIds = new Set(state.project.stops.map((stop) => stop.id));
            const deletedStops = new Set(Array.from(ids).filter((id) => stopIds.has(id)));
            if (state.project.stops.length - deletedStops.size < 2) {
              for (const id of deletedStops) ids.delete(id);
              deletedStops.clear();
            }
            state.project.stops = state.project.stops.filter((stop) => !ids.has(stop.id));
            state.project.legs = state.project.legs.filter(
              (leg) => !ids.has(leg.id) && !deletedStops.has(leg.from) && !deletedStops.has(leg.to),
            );
            state.project.symbols = state.project.symbols.filter((symbol) => !ids.has(symbol.id));
          state.project.scatter = state.project.scatter.filter((scatter) => !ids.has(scatter.id));
          state.project.boundaries = (state.project.boundaries ?? []).filter((boundary) => !ids.has(boundary.id));
          state.selectedObjectId = state.project.legs[0]?.id ?? state.project.stops[0]?.id ?? null;
            state.selectedIds = state.selectedObjectId ? [state.selectedObjectId] : [];
            return;
          }

          const waypointIds = new Set(state.project.waypoints.map((waypoint) => waypoint.id));
          const deletedWaypoints = new Set(Array.from(ids).filter((id) => waypointIds.has(id)));
          if (state.project.waypoints.length - deletedWaypoints.size < 2) {
            for (const id of deletedWaypoints) ids.delete(id);
            deletedWaypoints.clear();
          }
          state.project.waypoints = state.project.waypoints.filter((waypoint) => !ids.has(waypoint.id));
          state.project.routes = state.project.routes.filter(
            (route) => !ids.has(route.id) && route.waypointIds.every((id) => !deletedWaypoints.has(id)),
          );
          state.project.icons = state.project.icons.filter((icon) => !ids.has(icon.id));
          state.project.scatter = state.project.scatter.filter((scatter) => !ids.has(scatter.id));
          state.selectedObjectId = state.project.routes[0]?.id ?? state.project.waypoints[0]?.id ?? null;
          state.selectedIds = state.selectedObjectId ? [state.selectedObjectId] : [];
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
          if (scatter) {
            scatter.visible = !scatter.visible;
            return;
          }
          const boundary = (state.project.boundaries ?? []).find((item) => item.id === id);
          if (boundary) boundary.visible = !boundary.visible;
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
    updateProjectMeta: (update) => {
      set((state) => {
        if (state.project.kind !== "travel") return;
        if (update.name?.trim()) state.project.name = update.name.trim().slice(0, 120);
        if (update.subtitle !== undefined) state.project.subtitle = update.subtitle.trim().slice(0, 160);
        if (update.durationDays !== undefined && Number.isFinite(update.durationDays)) {
          state.project.durationDays = Math.min(9_999, Math.max(1, Math.round(update.durationDays)));
        }
      });
    },
    copySelectedFormat: () => {
      set((state) => {
        const format = readFormat(state.project, state.selectedObjectId);
        if (!format) return;
        state.formatClipboard = format;
        state.formatPainterActive = true;
      });
    },
    applyFormatToObject: (id) => {
      let applied = false;
      set((state) => {
        applied = applyFormat(state, id);
        if (applied) {
          state.formatPainterActive = false;
          state.selectedObjectId = id;
          state.selectedIds = [id];
        }
      });
      return applied;
    },
    cancelFormatPainter: () => {
      set((state) => {
        state.formatPainterActive = false;
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
        if (update.labelOffset?.every(Number.isFinite)) stop.labelOffset = update.labelOffset;
        if (update.labelAnchor) stop.labelAnchor = update.labelAnchor;
        if (update.labelStyle) {
          ensureStopStyleDefaults(stop);
          Object.assign(stop.labelStyle, update.labelStyle);
        }
        if (update.pointStyle) {
          ensureStopStyleDefaults(stop);
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
        if (leg) {
          ensureLegStyleDefaults(leg);
          Object.assign(leg.style, { [key]: value });
        }
      });
    },
    applyLegShapeToAll: (legId) => {
      set((state) => {
        if (state.project.kind !== "travel") return;
        const source = state.project.legs.find((leg) => leg.id === legId);
        if (!source) return;
        ensureLegStyleDefaults(source);
        for (const leg of state.project.legs) {
          ensureLegStyleDefaults(leg);
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
    addBoundaryAsset: (boundary) => {
      set((state) => {
        if (state.project.kind !== "travel") return;
        state.project.boundaries ??= [];
        const ids = new Set(state.project.boundaries.map((item) => item.id));
        let id = boundary.id;
        let index = 2;
        while (ids.has(id)) {
          id = `${boundary.id}-${index}`;
          index += 1;
        }
        state.project.boundaries.push({ ...boundary, id });
        state.selectedObjectId = id;
        state.selectedIds = [id];
      });
    },
    updateBoundaryAsset: (id, update) => {
      set((state) => {
        if (state.project.kind !== "travel") return;
        const boundary = (state.project.boundaries ?? []).find((item) => item.id === id);
        if (!boundary) return;
        if (update.name?.trim()) boundary.name = update.name.trim().slice(0, 100);
        if (update.fill) boundary.fill = update.fill;
        if (update.stroke) boundary.stroke = update.stroke;
        if (update.opacity !== undefined && Number.isFinite(update.opacity)) boundary.opacity = Math.min(1, Math.max(0, update.opacity));
        if (update.visible !== undefined) boundary.visible = update.visible;
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
        state.project.presentation = { ...state.project.presentation, [key]: value };
      });
    },
    resetPresentation: () => {
      set((state) => {
        state.project.presentation = {
          lineScale: 1,
          textScale: 1,
          symbolScale: 1,
          arrowheadScale: 1,
          lineHaloColor: "#ffffff",
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
        };
      });
    },
    resetSymbolicLayout: () => {
      set((state) => {
        if (state.project.kind !== "travel") return;
        for (const stop of state.project.stops) delete stop.diagramPosition;
        for (const symbol of state.project.symbols) delete symbol.diagramPosition;
        state.project.presentation.titlePosition = { x: 54, y: 56 };
      });
    },
    updateStopLabelOffset: (id, axis, value) => {
      set((state) => {
        if (state.project.kind !== "travel") return;
        const stop = state.project.stops.find((item) => item.id === id);
        if (stop) {
          ensureStopStyleDefaults(stop);
          stop.labelOffset[axis] = value;
        }
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
    moveProjectTitle: (position) => {
      set((state) => {
        if (state.project.kind !== "travel") return;
        state.project.presentation.titlePosition = position;
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
        if (leg) {
          ensureLegStyleDefaults(leg);
          leg.style.curvature = Math.min(10, Math.max(-10, curvature));
        }
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
          ensureStopStyleDefaults(stop);
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
