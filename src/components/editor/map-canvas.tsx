"use client";

import { LocateFixed, Minus, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type {
  ExpressionSpecification,
  GeoJSONSource,
  Map as MapLibreMap,
  Marker,
} from "maplibre-gl";

import { Button } from "@/components/ui/button";
import { TrailCanvas } from "@/components/editor/trail-canvas";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { TravelProject } from "@/lib/project-schema";
import {
  buildTravelLegsGeoJson,
  getLegCoordinates,
} from "@/lib/travel-geometry";
import { useEditorStore } from "@/store/editor-store";

const OPEN_FREE_MAP_STYLES = {
  positron: "https://tiles.openfreemap.org/styles/positron",
  liberty: "https://tiles.openfreemap.org/styles/liberty",
  bright: "https://tiles.openfreemap.org/styles/bright",
} as const;
const TERRAIN_TILES =
  "https://elevation-tiles-prod.s3.amazonaws.com/terrarium/{z}/{x}/{y}.png";

type MapLibreModule = typeof import("maplibre-gl");

function getTripBounds(project: TravelProject): [[number, number], [number, number]] {
  const longitudes = project.stops.map((stop) => stop.coordinates[0]);
  const latitudes = project.stops.map((stop) => stop.coordinates[1]);
  return [
    [Math.min(...longitudes), Math.min(...latitudes)],
    [Math.max(...longitudes), Math.max(...latitudes)],
  ];
}

function addTravelLayers(map: MapLibreMap, project: TravelProject) {
  map.addSource("travel-legs", {
    type: "geojson",
    data: buildTravelLegsGeoJson(project, null),
  });

  const widthExpression: ExpressionSpecification = [
    "case",
    ["boolean", ["get", "selected"], false],
    4.5,
    2.7,
  ];

  map.addLayer({
    id: "travel-leg-halo",
    type: "line",
    source: "travel-legs",
    paint: {
      "line-color": "rgba(255,255,255,0.9)",
      "line-width": ["case", ["boolean", ["get", "selected"], false], 9, 7],
      "line-opacity": 0.88,
    },
    layout: {
      "line-cap": "round",
      "line-join": "round",
    },
  });

  map.addLayer({
    id: "travel-leg-solid",
    type: "line",
    source: "travel-legs",
    filter: ["==", ["get", "line"], "solid"],
    paint: {
      "line-color": ["get", "color"],
      "line-width": widthExpression,
    },
    layout: {
      "line-cap": "round",
      "line-join": "round",
    },
  });

  map.addLayer({
    id: "travel-leg-dashed",
    type: "line",
    source: "travel-legs",
    filter: ["==", ["get", "line"], "dashed"],
    paint: {
      "line-color": ["get", "color"],
      "line-width": widthExpression,
      "line-dasharray": [2, 2.2],
    },
    layout: {
      "line-cap": "round",
      "line-join": "round",
    },
  });

  map.addLayer({
    id: "travel-direction",
    type: "symbol",
    source: "travel-legs",
    layout: {
      "symbol-placement": "line",
      "symbol-spacing": 92,
      "text-field": "›",
      "text-size": 19,
      "text-keep-upright": false,
      "text-rotation-alignment": "map",
      "text-allow-overlap": true,
    },
    paint: {
      "text-color": ["get", "color"],
      "text-halo-color": "rgba(255,255,255,0.95)",
      "text-halo-width": 1.5,
    },
  });
}

function addTerrainLayers(
  map: MapLibreMap,
  demSource: InstanceType<
    (typeof import("maplibre-contour"))["default"]["DemSource"]
  >,
  project: TravelProject,
) {
  const unitMultiplier = project.map.elevationUnits === "ft" ? 3.28084 : 1;
  const interval = project.map.contourInterval;

  map.addSource("mapper-dem", {
    type: "raster-dem",
    encoding: "terrarium",
    tiles: [demSource.sharedDemProtocolUrl],
    maxzoom: 13,
    tileSize: 256,
    attribution:
      'Elevation: <a href="https://registry.opendata.aws/terrain-tiles/">Mapzen Terrain Tiles</a>',
  });

  map.addLayer(
    {
      id: "mapper-hillshade",
      type: "hillshade",
      source: "mapper-dem",
      layout: {
        visibility: project.map.showHillshade ? "visible" : "none",
      },
      paint: {
        "hillshade-exaggeration": 0.22,
        "hillshade-shadow-color": "#365344",
        "hillshade-highlight-color": "#f4f7f3",
        "hillshade-accent-color": "#849b8f",
      },
    },
    map.getStyle().layers.find((layer) => layer.type === "symbol")?.id,
  );

  map.addSource("mapper-contours", {
    type: "vector",
    tiles: [
      demSource.contourProtocolUrl({
        multiplier: unitMultiplier,
        thresholds: {
          7: [interval * 5, interval * 10],
          9: [interval * 2, interval * 10],
          11: [interval, interval * 5],
          13: [Math.max(10, interval / 2), interval * 5],
        },
        contourLayer: "contours",
        elevationKey: "ele",
        levelKey: "level",
        extent: 4096,
        buffer: 1,
      }),
    ],
    maxzoom: 15,
    attribution:
      'Elevation: <a href="https://registry.opendata.aws/terrain-tiles/">Mapzen Terrain Tiles</a>',
  });

  const firstLabel = map.getStyle().layers.find(
    (layer) => layer.type === "symbol",
  )?.id;

  map.addLayer(
    {
      id: "mapper-contour-lines",
      type: "line",
      source: "mapper-contours",
      "source-layer": "contours",
      layout: {
        visibility: project.map.showContours ? "visible" : "none",
      },
      paint: {
        "line-color": "#557564",
        "line-opacity": 0.52,
        "line-width": ["match", ["get", "level"], 1, 1.15, 0.55],
      },
    },
    firstLabel,
  );

  map.addLayer(
    {
      id: "mapper-contour-labels",
      type: "symbol",
      source: "mapper-contours",
      "source-layer": "contours",
      filter: [">", ["get", "level"], 0],
      layout: {
        visibility: project.map.showContours ? "visible" : "none",
        "symbol-placement": "line",
        "text-size": 10,
        "text-field": [
          "concat",
          ["number-format", ["get", "ele"], { "max-fraction-digits": 0 }],
          project.map.elevationUnits,
        ],
      },
      paint: {
        "text-color": "#466554",
        "text-halo-color": "rgba(244,247,245,0.9)",
        "text-halo-width": 1.2,
      },
    },
    firstLabel,
  );
}

function createStopElement(
  stop: TravelProject["stops"][number],
  selected: boolean,
  selectObject: (id: string) => void,
) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `mapper-stop${selected ? " is-selected" : ""}`;
  button.setAttribute(
    "aria-label",
    `${stop.name}, ${stop.dayLabel}${stop.elevation ? `, ${stop.elevation} meters` : ""}`,
  );
  button.addEventListener("click", () => selectObject(stop.id));

  const dot = document.createElement("span");
  dot.className = "mapper-stop__dot";
  dot.setAttribute("aria-hidden", "true");

  const label = document.createElement("span");
  label.className = "mapper-stop__label";

  const name = document.createElement("strong");
  name.textContent = stop.name;

  const day = document.createElement("small");
  day.textContent = stop.dayLabel;

  label.append(name, day);
  button.append(dot, label);
  return button;
}

function createModeElement(
  mode: TravelProject["legs"][number]["mode"],
  legId: string,
  selected: boolean,
  selectObject: (id: string) => void,
) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `mapper-mode${selected ? " is-selected" : ""}`;
  button.textContent = mode;
  button.setAttribute("aria-label", `Select ${mode} travel leg`);
  button.addEventListener("click", () => selectObject(legId));
  return button;
}

export function MapCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const maplibreRef = useRef<MapLibreModule | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const [ready, setReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(7.2);
  const project = useEditorStore((state) => state.project);
  const selectedObjectId = useEditorStore((state) => state.selectedObjectId);
  const selectObject = useEditorStore((state) => state.selectObject);

  const travelProject = project.kind === "travel" ? project : null;

  useEffect(() => {
    if (!containerRef.current || !travelProject) return;
    const activeProject = travelProject;
    setReady(false);
    setMapError(null);
    let disposed = false;
    let demProtocolIds: string[] = [];

    async function initializeMap() {
      try {
        const [maplibre, contourModule] = await Promise.all([
          import("maplibre-gl"),
          import("maplibre-contour"),
        ]);
        if (disposed || !containerRef.current) return;

        maplibreRef.current = maplibre;
        const demSource = new contourModule.default.DemSource({
          url: TERRAIN_TILES,
          encoding: "terrarium",
          maxzoom: 13,
          cacheSize: 100,
          timeoutMs: 12_000,
          worker: false,
          id: "mapper-elevation",
        });
        demSource.setupMaplibre(maplibre);
        demProtocolIds = [
          demSource.sharedDemProtocolId,
          demSource.contourProtocolId,
        ];

        const map = new maplibre.Map({
          container: containerRef.current,
          style: OPEN_FREE_MAP_STYLES[activeProject.map.style],
          center: [84.63, 28.05],
          zoom: 7.2,
          attributionControl: false,
          cooperativeGestures: true,
          maxPitch: 0,
          canvasContextAttributes: { preserveDrawingBuffer: true },
        });
        mapRef.current = map;
        map.addControl(
          new maplibre.AttributionControl({ compact: true }),
          "bottom-right",
        );

        map.on("zoom", () => setZoom(map.getZoom()));
        map.once("load", () => {
          if (disposed) return;
          try {
            addTerrainLayers(map, demSource, activeProject);
            addTravelLayers(map, activeProject);
            map.fitBounds(getTripBounds(activeProject), {
              padding: { top: 95, right: 95, bottom: 95, left: 95 },
              duration: 0,
              maxZoom: 10.5,
            });

            for (const layerId of ["travel-leg-solid", "travel-leg-dashed"]) {
              map.on("click", layerId, (event) => {
                const id = event.features?.[0]?.properties?.id;
                if (typeof id === "string") selectObject(id);
              });
              map.on("mouseenter", layerId, () => {
                map.getCanvas().style.cursor = "pointer";
              });
              map.on("mouseleave", layerId, () => {
                map.getCanvas().style.cursor = "";
              });
            }
            setReady(true);
          } catch {
            setMapError("The itinerary layers could not be added to the map.");
          }
        });

        map.on("error", (event) => {
          if (!map.isStyleLoaded() && event.error) {
            setMapError("The basemap style could not be loaded. Check your connection.");
          }
        });

      } catch {
        setMapError("The map renderer could not be started in this browser.");
      }
    }

    initializeMap();
    return () => {
      disposed = true;
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
      if (maplibreRef.current) {
        demProtocolIds.forEach((id) => maplibreRef.current?.removeProtocol(id));
      }
    };
    // The map instance is intentionally created once for the active project mode.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    project.kind,
    selectObject,
    travelProject?.map.contourInterval,
    travelProject?.map.elevationUnits,
    travelProject?.map.style,
  ]);

  useEffect(() => {
    const map = mapRef.current;
    const maplibre = maplibreRef.current;
    if (!ready || !map || !maplibre || !travelProject) return;

    const source = map.getSource("travel-legs") as GeoJSONSource | undefined;
    source?.setData(buildTravelLegsGeoJson(travelProject, selectedObjectId));

    for (const layerId of ["mapper-contour-lines", "mapper-contour-labels"]) {
      if (map.getLayer(layerId)) {
        map.setLayoutProperty(
          layerId,
          "visibility",
          travelProject.map.showContours ? "visible" : "none",
        );
      }
    }
    if (map.getLayer("mapper-hillshade")) {
      map.setLayoutProperty(
        "mapper-hillshade",
        "visibility",
        travelProject.map.showHillshade ? "visible" : "none",
      );
    }

    markersRef.current.forEach((marker) => marker.remove());
    const nextMarkers: Marker[] = [];

    for (const stop of travelProject.stops.filter((item) => item.visible)) {
      nextMarkers.push(
        new maplibre.Marker({
          element: createStopElement(
            stop,
            selectedObjectId === stop.id,
            selectObject,
          ),
          anchor: "left",
        })
          .setLngLat(stop.coordinates)
          .addTo(map),
      );
    }

    for (const leg of travelProject.legs.filter((item) => item.visible)) {
      const coordinates = getLegCoordinates(travelProject, leg);
      const midpoint = coordinates[Math.floor(coordinates.length / 2)];
      if (!midpoint) continue;
      nextMarkers.push(
        new maplibre.Marker({
          element: createModeElement(
            leg.mode,
            leg.id,
            selectedObjectId === leg.id,
            selectObject,
          ),
          anchor: "center",
        })
          .setLngLat(midpoint)
          .addTo(map),
      );
    }

    markersRef.current = nextMarkers;
  }, [ready, selectedObjectId, selectObject, travelProject]);

  if (!travelProject) {
    return <TrailCanvas />;
  }
  const activeProject = travelProject;

  function fitTrip() {
    mapRef.current?.fitBounds(getTripBounds(activeProject), {
      padding: { top: 95, right: 95, bottom: 95, left: 95 },
      duration: 500,
      maxZoom: 10.5,
    });
  }

  return (
    <section
      aria-label="Travel itinerary map"
      data-export-root
      className="relative min-h-0 flex-1 overflow-hidden bg-canvas"
    >
      <div ref={containerRef} className="absolute inset-0" />

      <div className="pointer-events-none absolute left-4 top-4 max-w-[calc(100%-7rem)] border-l-4 border-trail bg-popover/94 px-4 py-3 shadow-md backdrop-blur-sm">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          {travelProject.durationDays} day journey
        </p>
        <h2 className="truncate text-base font-extrabold tracking-tight sm:text-lg">
          {travelProject.name}
        </h2>
        <p className="hidden truncate text-xs text-muted-foreground sm:block">
          {travelProject.subtitle}
        </p>
      </div>

      {!ready && !mapError ? (
        <div className="absolute inset-0 grid place-items-center bg-canvas/85">
          <p className="border-l-2 border-water pl-3 font-mono text-xs uppercase tracking-[0.12em] text-muted-foreground">
            Loading open map data
          </p>
        </div>
      ) : null}

      {mapError ? (
        <div role="alert" className="absolute inset-x-4 top-24 border border-destructive bg-popover p-3 text-sm text-destructive shadow-md">
          {mapError}
        </div>
      ) : null}

      <div className="absolute right-4 top-4 flex items-center rounded-md border bg-popover/95 p-1 shadow-sm backdrop-blur-sm">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => mapRef.current?.zoomOut()}
              aria-label="Zoom out"
            >
              <Minus aria-hidden="true" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Zoom out</TooltipContent>
        </Tooltip>
        <span className="min-w-12 px-1 text-center font-mono text-[10px] tabular-nums text-muted-foreground">
          z{zoom.toFixed(1)}
        </span>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => mapRef.current?.zoomIn()}
              aria-label="Zoom in"
            >
              <Plus aria-hidden="true" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Zoom in</TooltipContent>
        </Tooltip>
        <div className="mx-1 h-4 w-px bg-border" aria-hidden="true" />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={fitTrip}
              aria-label="Fit complete journey to view"
            >
              <LocateFixed aria-hidden="true" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Fit journey</TooltipContent>
        </Tooltip>
      </div>

      <p className="sr-only" aria-live="polite">
        {ready
          ? `Map loaded at zoom ${zoom.toFixed(1)} with ${travelProject.stops.length} stops.`
          : "Loading map."}
      </p>
    </section>
  );
}
