"use client";

import { LocateFixed, Minus, MousePointer2, Plus, Shapes } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ExpressionSpecification,
  GeoJSONSource,
  Map as MapLibreMap,
  Marker,
} from "maplibre-gl";

import { Button } from "@/components/ui/button";
import { TrailCanvas } from "@/components/editor/trail-canvas";
import { SymbolicTravelCanvas } from "@/components/editor/symbolic-travel-canvas";
import { getIconSvg, getPointIconSvg } from "@/lib/builtin-icons";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { TravelProject } from "@/lib/project-schema";
import { generateTravelScatter } from "@/lib/scatter";
import {
  buildTravelLegsGeoJson,
  getLegCoordinates,
  getWrappedLongitudeBounds,
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
  const [west, east] = getWrappedLongitudeBounds(longitudes);
  return [
    [west, Math.min(...latitudes)],
    [east, Math.max(...latitudes)],
  ];
}

function getTripCamera(project: TravelProject) {
  const [[west, south], [east, north]] = getTripBounds(project);
  const span = Math.max(east - west, (north - south) * 1.6, 0.01);
  return {
    center: [(west + east) / 2, (south + north) / 2] as [number, number],
    zoom: Math.min(10.5, Math.max(2, Math.log2(360 / span) - 1.25)),
  };
}

function addTravelLayers(map: MapLibreMap, project: TravelProject) {
  map.addSource("travel-legs", {
    type: "geojson",
    data: buildTravelLegsGeoJson(project, null),
  });

  const widthExpression: ExpressionSpecification = [
    "case",
    ["boolean", ["get", "selected"], false],
    4.5 * project.presentation.lineScale,
    2.7 * project.presentation.lineScale,
  ];

  map.addLayer({
    id: "travel-leg-halo",
    type: "line",
    source: "travel-legs",
    paint: {
      "line-color": "rgba(255,255,255,0.9)",
      "line-width": [
        "case",
        ["boolean", ["get", "selected"], false],
        9 * project.presentation.lineScale,
        7 * project.presentation.lineScale,
      ],
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
    id: "travel-leg-dotted",
    type: "line",
    source: "travel-legs",
    filter: ["==", ["get", "line"], "dotted"],
    paint: {
      "line-color": ["get", "color"],
      "line-width": widthExpression,
      "line-dasharray": [0.2, 2.2],
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
      "text-field": [
        "case",
        ["boolean", ["get", "showDayLabel"], false],
        ["concat", "> ", ["get", "dayLabel"]],
        ">",
      ],
      "text-font": ["Noto Sans Regular"],
      "text-size": 19 * project.presentation.textScale,
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
        "text-font": ["Noto Sans Regular"],
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
  labelPosition: number,
  textScale: number,
  iconSvg: string | null,
  selectObject: (id: string) => void,
) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `mapper-stop${selected ? " is-selected" : ""}`;
  button.dataset.labelPosition = String(labelPosition % 4);
  button.dataset.labelAnchor = stop.labelAnchor;
  button.dataset.labelOffsetX = String(stop.labelOffset[0]);
  button.dataset.labelOffsetY = String(stop.labelOffset[1]);
  button.style.setProperty("--mapper-text-scale", String(textScale));
  button.setAttribute(
    "aria-label",
    `${stop.name}, ${stop.dayLabel}${stop.elevation ? `, ${stop.elevation} meters` : ""}`,
  );
  button.addEventListener("click", () => selectObject(stop.id));

  const dot = document.createElement("span");
  dot.className = "mapper-stop__dot";
  dot.setAttribute("aria-hidden", "true");
  if (iconSvg) dot.innerHTML = iconSvg;

  const label = document.createElement("span");
  label.className = "mapper-stop__label";
  label.style.translate = `${stop.labelOffset[0]}px ${stop.labelOffset[1]}px`;
  if (stop.labelStyle) {
    label.style.setProperty("--label-font-size", `${stop.labelStyle.fontSize}`);
    label.style.setProperty("--label-color", stop.labelStyle.color);
    label.style.setProperty("--label-bold", stop.labelStyle.bold ? "800" : "400");
  }

  const name = document.createElement("strong");
  name.textContent = stop.name;
  if (stop.labelStyle) {
    name.style.fontSize = `calc(0.72rem * var(--mapper-text-scale, 1) * ${stop.labelStyle.fontSize})`;
    name.style.color = stop.labelStyle.color;
    name.style.fontWeight = stop.labelStyle.bold ? "800" : "400";
  }

  const day = document.createElement("small");
  day.textContent = stop.dayLabel;
  if (stop.labelStyle) {
    day.style.color = stop.labelStyle.color;
  }

  label.append(name, day);
  button.append(dot, label);
  return button;
}

function resolveLabelOverlaps(elements: HTMLButtonElement[], container: HTMLElement) {
  const occupied: DOMRect[] = [];
  const bounds = container.getBoundingClientRect();

  for (const [index, element] of elements.entries()) {
    const label = element.querySelector<HTMLElement>(".mapper-stop__label");
    if (!label) continue;
    label.style.visibility = "visible";
    const baseX = Number(element.dataset.labelOffsetX ?? 0);
    const baseY = Number(element.dataset.labelOffsetY ?? 0);
    if (baseX !== 0 || baseY !== 0 || element.dataset.labelAnchor !== "auto") {
      label.style.translate = `${baseX}px ${baseY}px`;
      occupied.push(label.getBoundingClientRect());
      continue;
    }
    let placed = false;

    for (const verticalShift of [0, -42, 42, -84, 84]) {
      for (let candidate = 0; candidate < 4; candidate += 1) {
        element.dataset.labelPosition = String((index + candidate) % 4);
        label.style.translate = `${baseX}px ${baseY + verticalShift}px`;
        const rect = label.getBoundingClientRect();
        const inside =
          rect.left >= bounds.left + 4 &&
          rect.right <= bounds.right - 4 &&
          rect.top >= bounds.top + 4 &&
          rect.bottom <= bounds.bottom - 4;
        const overlaps = occupied.some(
          (other) =>
            rect.left < other.right + 5 &&
            rect.right > other.left - 5 &&
            rect.top < other.bottom + 5 &&
            rect.bottom > other.top - 5,
        );
        if (inside && !overlaps) {
          occupied.push(rect);
          placed = true;
          break;
        }
      }
      if (placed) break;
    }

    if (!placed) label.style.visibility = "hidden";
  }
}

function createModeElement(
  mode: TravelProject["legs"][number]["mode"],
  legId: string,
  selected: boolean,
  textScale: number,
  selectObject: (id: string) => void,
  iconId?: string | null,
  iconSvg?: string | null,
) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `mapper-mode${selected ? " is-selected" : ""}`;
  if (iconId && iconSvg) {
    button.style.fontSize = "0";
    button.style.width = "32px";
    button.style.height = "32px";
    button.style.background = "var(--card)";
    button.style.borderRadius = "50%";
    button.style.border = "2px solid var(--border)";
    button.style.display = "grid";
    button.style.placeItems = "center";
    const wrapper = document.createElement("span");
    wrapper.style.width = "20px";
    wrapper.style.height = "20px";
    wrapper.style.color = "var(--foreground)";
    wrapper.innerHTML = iconSvg;
    button.append(wrapper);
  } else {
    button.style.fontSize = `${0.48 * textScale}rem`;
    button.textContent = mode;
  }
  button.setAttribute("aria-label", `Select ${mode} travel leg`);
  button.addEventListener("click", () => selectObject(legId));
  return button;
}

function createSymbolElement(
  iconId: string,
  svg: string,
  scale: number,
  rotation: number,
  selected: boolean,
  selectObject: (id: string) => void,
  objectId: string,
  globalScale: number,
) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `mapper-symbol${selected ? " is-selected" : ""}`;
  button.style.width = `${Math.round(30 * scale * globalScale)}px`;
  button.style.height = `${Math.round(30 * scale * globalScale)}px`;
  const graphic = document.createElement("span");
  graphic.className = "mapper-symbol__graphic";
  graphic.style.transform = `rotate(${rotation}deg)`;
  graphic.innerHTML = svg;
  button.append(graphic);
  button.setAttribute("aria-label", `Select ${iconId} symbol`);
  button.addEventListener("click", () => selectObject(objectId));
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
  const [titleVisible, setTitleVisible] = useState(true);
  const project = useEditorStore((state) => state.project);
  const selectedObjectId = useEditorStore((state) => state.selectedObjectId);
  const selectObject = useEditorStore((state) => state.selectObject);
  const moveTravelStop = useEditorStore((state) => state.moveTravelStop);
  const moveTravelSymbol = useEditorStore((state) => state.moveTravelSymbol);
  const moveTravelLegControl = useEditorStore((state) => state.moveTravelLegControl);
  const placePOISymbol = useEditorStore((state) => state.placePOISymbol);
  const selectedIconId = useEditorStore((state) => state.selectedIconId);

  const [placingPOI, setPlacingPOI] = useState(false);
  const placingPOIRef = useRef(false);

  useEffect(() => {
    placingPOIRef.current = placingPOI;
    if (mapRef.current) {
      mapRef.current.getCanvas().style.cursor = placingPOI ? "crosshair" : "";
    }
  }, [placingPOI]);

  const travelProject = project.kind === "travel" ? project : null;

  useEffect(() => {
    if (
      !containerRef.current ||
      !travelProject ||
      travelProject.map.display !== "geographic"
    )
      return;
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
        maplibre.setWorkerUrl("/maplibre-gl-worker.mjs");
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

        const initialCamera = getTripCamera(activeProject);
        const map = new maplibre.Map({
          container: containerRef.current,
          style: OPEN_FREE_MAP_STYLES[activeProject.map.style],
          center: initialCamera.center,
          zoom: initialCamera.zoom,
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
            for (const layerId of ["travel-leg-solid", "travel-leg-dashed", "travel-leg-dotted"]) {
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
            map.on("click", (event) => {
              if (placingPOIRef.current) {
                if (event.defaultPrevented) return;
                placePOISymbol([event.lngLat.lng, event.lngLat.lat]);
              }
            });
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
    travelProject?.map.display,
    travelProject?.map.contourInterval,
    travelProject?.map.elevationUnits,
    travelProject?.map.style,
  ]);

  useEffect(() => {
    const map = mapRef.current;
    const maplibre = maplibreRef.current;
    if (
      !ready ||
      !map ||
      !maplibre ||
      !travelProject ||
      travelProject.map.display !== "geographic"
    )
      return;

    const source = map.getSource("travel-legs") as GeoJSONSource | undefined;
    source?.setData(buildTravelLegsGeoJson(travelProject, selectedObjectId));
    const lineScale = travelProject.presentation.lineScale;
    const lineWidth: ExpressionSpecification = [
      "case",
      ["boolean", ["get", "selected"], false],
      4.5 * lineScale,
      2.7 * lineScale,
    ];
    for (const layerId of ["travel-leg-solid", "travel-leg-dashed", "travel-leg-dotted"]) {
      if (map.getLayer(layerId)) map.setPaintProperty(layerId, "line-width", lineWidth);
    }
    if (map.getLayer("travel-leg-halo")) {
      map.setPaintProperty("travel-leg-halo", "line-width", [
        "case",
        ["boolean", ["get", "selected"], false],
        9 * lineScale,
        7 * lineScale,
      ]);
    }
    if (map.getLayer("travel-direction")) {
      map.setLayoutProperty(
        "travel-direction",
        "text-size",
        19 * travelProject.presentation.textScale,
      );
    }

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
    const stopElements: HTMLButtonElement[] = [];

    for (const [index, stop] of travelProject.stops
      .filter((item) => item.visible)
      .entries()) {
      const element = createStopElement(
        stop,
        selectedObjectId === stop.id,
        index,
        travelProject.presentation.textScale,
        getPointIconSvg(stop.icon, travelProject.iconAssets),
        selectObject,
      );
      stopElements.push(element);
      const marker = new maplibre.Marker({
          element,
          anchor: "center",
          draggable: true,
        })
        .setLngLat(stop.coordinates)
        .addTo(map);
      marker.on("dragend", () => {
        const position = marker.getLngLat();
        moveTravelStop(stop.id, [position.lng, position.lat]);
      });
      nextMarkers.push(marker);
    }

    for (const leg of travelProject.legs.filter((item) => item.visible)) {
      const coordinates = getLegCoordinates(travelProject, leg);
      const midpoint = coordinates[Math.floor(coordinates.length / 2)];
      if (!midpoint) continue;
      const legIconSvg = leg.iconId ? getIconSvg(leg.iconId, travelProject.iconAssets) : null;
      const marker = new maplibre.Marker({
        element: createModeElement(
          leg.mode,
          leg.id,
          selectedObjectId === leg.id,
          travelProject.presentation.textScale,
          selectObject,
          leg.iconId,
          legIconSvg,
        ),
        anchor: "center",
        draggable: true,
      })
        .setLngLat(midpoint)
        .addTo(map);
      const startStop = travelProject.stops.find((item) => item.id === leg.from);
      const endStop = travelProject.stops.find((item) => item.id === leg.to);
      marker.on("dragend", () => {
        if (!startStop || !endStop) return;
        const position = marker.getLngLat();
        const startPixel = map.project(startStop.coordinates);
        const endPixel = map.project(endStop.coordinates);
        const dragPixel = map.project([position.lng, position.lat]);
        const dx = endPixel.x - startPixel.x;
        const dy = endPixel.y - startPixel.y;
        const length = Math.hypot(dx, dy) || 1;
        const normalX = -dy / length;
        const normalY = dx / length;
        const midX = (startPixel.x + endPixel.x) / 2;
        const midY = (startPixel.y + endPixel.y) / 2;
        const bendUnit = Math.max(20, Math.min(240, length * 0.3));
        const curvature = ((dragPixel.x - midX) * normalX + (dragPixel.y - midY) * normalY) / bendUnit;
        moveTravelLegControl(leg.id, curvature);
      });
      nextMarkers.push(marker);
    }

    for (const symbol of travelProject.symbols.filter((item) => item.visible)) {
      const svg = getIconSvg(symbol.iconId, travelProject.iconAssets);
      if (!svg) continue;
      const marker = new maplibre.Marker({
          element: createSymbolElement(
            symbol.iconId,
            svg,
            symbol.scale,
            symbol.rotation,
            selectedObjectId === symbol.id,
            selectObject,
            symbol.id,
            travelProject.presentation.symbolScale,
          ),
          anchor: "center",
          draggable: true,
        })
        .setLngLat(symbol.coordinates)
        .addTo(map);
      marker.on("dragend", () => {
        const position = marker.getLngLat();
        moveTravelSymbol(symbol.id, [position.lng, position.lat]);
      });
      nextMarkers.push(marker);
    }

    for (const scatter of travelProject.scatter.filter((item) => item.visible)) {
      for (const placement of generateTravelScatter(travelProject, scatter)) {
        const svg = getIconSvg(placement.iconId, travelProject.iconAssets);
        if (!svg) continue;
        nextMarkers.push(
          new maplibre.Marker({
            element: createSymbolElement(
              placement.iconId,
              svg,
              placement.scale,
              placement.rotation,
              selectedObjectId === scatter.id,
              selectObject,
              scatter.id,
              travelProject.presentation.symbolScale,
            ),
            anchor: "center",
          })
            .setLngLat(placement.coordinates)
            .addTo(map),
        );
      }
    }

    requestAnimationFrame(() => resolveLabelOverlaps(stopElements, map.getContainer()));

    markersRef.current = nextMarkers;
  }, [
    moveTravelStop,
    moveTravelSymbol,
    moveTravelLegControl,
    ready,
    selectedObjectId,
    selectObject,
    travelProject,
  ]);

  if (!travelProject) {
    return <TrailCanvas />;
  }
  if (travelProject.map.display === "symbolic") {
    return <SymbolicTravelCanvas project={travelProject} />;
  }
  const activeProject = travelProject;

  function fitTrip() {
    const map = mapRef.current;
    if (!map) return;
    const coordinates = [
      ...activeProject.stops.filter((stop) => stop.visible).map((stop) => stop.coordinates),
      ...activeProject.legs
        .filter((leg) => leg.visible)
        .flatMap((leg) => getLegCoordinates(activeProject, leg)),
      ...activeProject.symbols.filter((symbol) => symbol.visible).map((symbol) => symbol.coordinates),
      ...activeProject.scatter
        .filter((scatter) => scatter.visible)
        .flatMap((scatter) => generateTravelScatter(activeProject, scatter))
        .map((placement) => placement.coordinates),
    ];
    if (!coordinates.length) return;
    const longitudes = coordinates.map((coordinate) => coordinate[0]);
    const latitudes = coordinates.map((coordinate) => coordinate[1]);
    const [west, east] = getWrappedLongitudeBounds(longitudes);
    const bounds: [[number, number], [number, number]] = [
      [west, Math.min(...latitudes)],
      [east, Math.max(...latitudes)],
    ];
    if (bounds[0][0] === bounds[1][0] && bounds[0][1] === bounds[1][1]) {
      map.easeTo({ center: bounds[0], zoom: 10, duration: 500 });
      return;
    }
    map.fitBounds(bounds, { padding: 72, maxZoom: 12, duration: 500 });
  }

  return (
    <section
      aria-label="Travel itinerary map"
      data-export-root
      className="relative min-h-0 flex-1 overflow-hidden bg-canvas outline-none focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring/60"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "0") fitTrip();
      }}
    >
      <div ref={containerRef} className="mapper-map" />

      {titleVisible ? (
        <div className="pointer-events-none absolute left-4 top-4 z-10 max-w-[calc(100%-7rem)] border-l-4 border-trail bg-popover/94 px-4 py-3 shadow-md backdrop-blur-sm">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            {travelProject.durationDays} day journey
          </p>
          <h2 className="truncate text-base font-extrabold tracking-tight sm:text-lg">
            {travelProject.name}
          </h2>
          <p className="hidden truncate text-xs text-muted-foreground sm:block">
            {travelProject.subtitle}
          </p>
          <button
            type="button"
            onClick={() => setTitleVisible(false)}
            className="pointer-events-auto absolute -right-2 -top-2 flex size-5 items-center justify-center rounded-full bg-popover text-[10px] text-muted-foreground shadow-sm hover:text-foreground"
            aria-label="Hide title"
          >
            ✕
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setTitleVisible(true)}
          className="pointer-events-auto absolute left-4 top-4 z-10 flex size-7 items-center justify-center rounded-md border bg-popover/80 text-xs text-muted-foreground shadow-sm hover:text-foreground"
          aria-label="Show title"
        >
          +
        </button>
      )}

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
              variant={placingPOI ? "default" : "ghost"}
              size="icon-sm"
              onClick={() => {
                setPlacingPOI((current) => !current);
                if (mapRef.current) {
                  mapRef.current.getCanvas().style.cursor = placingPOI ? "" : "crosshair";
                }
              }}
              aria-label={placingPOI ? "Stop placing symbols" : "Place a POI symbol on the map"}
            >
              <MousePointer2 aria-hidden="true" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{placingPOI ? "Stop placing" : "Place symbol"}</TooltipContent>
        </Tooltip>
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
