"use client";

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

import { sampleProject } from "@/data/sample-project";
import type { MapperProject, RouteNoise } from "@/lib/project-schema";

type EditorState = {
  project: MapperProject;
  selectedLayerId: string | null;
  zoom: number;
  selectLayer: (id: string) => void;
  toggleLayerVisibility: (id: string) => void;
  updateRouteNoise: <Key extends keyof RouteNoise>(
    routeId: string,
    key: Key,
    value: RouteNoise[Key],
  ) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
};

export const useEditorStore = create<EditorState>()(
  immer((set) => ({
    project: sampleProject,
    selectedLayerId: "route-ridge",
    zoom: 1,
    selectLayer: (id) => {
      set((state) => {
        state.selectedLayerId = id;
      });
    },
    toggleLayerVisibility: (id) => {
      set((state) => {
        const layer = state.project.layers.find((item) => item.id === id);
        if (layer) layer.visible = !layer.visible;
      });
    },
    updateRouteNoise: (routeId, key, value) => {
      set((state) => {
        const layer = state.project.layers.find((item) => item.id === routeId);
        if (layer?.type === "route") {
          Object.assign(layer.noise, { [key]: value });
        }
      });
    },
    zoomIn: () => {
      set((state) => {
        state.zoom = Math.min(2.5, Number((state.zoom + 0.1).toFixed(1)));
      });
    },
    zoomOut: () => {
      set((state) => {
        state.zoom = Math.max(0.5, Number((state.zoom - 0.1).toFixed(1)));
      });
    },
    resetZoom: () => {
      set((state) => {
        state.zoom = 1;
      });
    },
  })),
);
