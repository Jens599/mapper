"use client";

import { LocateFixed, Minus, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useEditorStore } from "@/store/editor-store";

const contours = [
  "M-40 566 C130 500 212 612 370 544 S664 445 1080 510",
  "M-55 490 C105 428 208 532 354 463 S650 380 1060 428",
  "M-25 412 C126 348 242 452 393 384 S678 292 1045 344",
  "M36 334 C181 277 274 366 430 302 S728 218 1030 264",
  "M110 247 C245 205 342 283 492 218 S758 145 956 179",
  "M238 166 C355 134 430 198 568 142 S786 87 905 110",
];

const trees = [
  [520, 456],
  [558, 474],
  [604, 444],
  [640, 478],
  [684, 436],
  [724, 468],
  [752, 421],
  [790, 451],
  [823, 405],
];

export function MapCanvas() {
  const project = useEditorStore((state) => state.project);
  const zoom = useEditorStore((state) => state.zoom);
  const zoomIn = useEditorStore((state) => state.zoomIn);
  const zoomOut = useEditorStore((state) => state.zoomOut);
  const resetZoom = useEditorStore((state) => state.resetZoom);
  const route = project.layers.find((layer) => layer.type === "route");
  const waypointLayer = project.layers.find(
    (layer) => layer.type === "waypoints",
  );
  const contourLayer = project.layers.find(
    (layer) => layer.type === "contours",
  );
  const scatterLayer = project.layers.find((layer) => layer.type === "scatter");
  const amplitude = route?.type === "route" ? route.noise.amplitude : 0;
  const offset = amplitude * 0.75;
  const viewWidth = project.canvas.width / zoom;
  const viewHeight = project.canvas.height / zoom;
  const viewX = (project.canvas.width - viewWidth) / 2;
  const viewY = (project.canvas.height - viewHeight) / 2;
  const routePath = [
    "M132 555",
    `C210 ${520 - offset}, 300 ${485 + offset}, 400 405`,
    `C470 ${350 - offset}, 568 ${337 + offset}, 655 250`,
    `C720 ${206 - offset}, 790 ${210 + offset}, 860 132`,
  ].join(" ");

  return (
    <section
      aria-label="Trail design canvas"
      className="canvas-grid relative min-h-0 flex-1 overflow-hidden"
    >
      <svg
        role="img"
        aria-labelledby="canvas-title canvas-description"
        viewBox={`${viewX} ${viewY} ${viewWidth} ${viewHeight}`}
        className="absolute inset-0 size-full"
        preserveAspectRatio="xMidYMid meet"
      >
        <title id="canvas-title">Alder Ridge conceptual trail map</title>
        <desc id="canvas-description">
          Four waypoints connected by a winding ridge trail over conceptual
          contour lines, with an alder grove southeast of the lookout.
        </desc>

        {contourLayer?.visible ? (
          <g
            fill="none"
            stroke="var(--terrain)"
            strokeWidth="1.4"
            opacity="0.43"
            vectorEffect="non-scaling-stroke"
            aria-hidden="true"
          >
            {contours.map((path) => (
              <path key={path} d={path} />
            ))}
          </g>
        ) : null}

        {scatterLayer?.visible ? (
          <g fill="var(--terrain)" opacity="0.72" aria-hidden="true">
            {trees.map(([x, y], index) => (
              <g key={`${x}-${y}`} transform={`translate(${x} ${y})`}>
                <path
                  d={`M0 ${-10 - (index % 3) * 2} L-7 3 H-2 V10 H2 V3 H7 Z`}
                />
              </g>
            ))}
          </g>
        ) : null}

        {route?.visible ? (
          <g aria-hidden="true">
            <path
              d={routePath}
              fill="none"
              stroke="color-mix(in srgb, var(--canvas) 80%, white)"
              strokeWidth="9"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
            <path
              d={routePath}
              fill="none"
              stroke="var(--trail)"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          </g>
        ) : null}

        {waypointLayer?.type === "waypoints" && waypointLayer.visible
          ? waypointLayer.points.map((point, index) => (
              <g key={point.id} transform={`translate(${point.x} ${point.y})`}>
                <circle
                  r="8"
                  fill="var(--card)"
                  stroke="var(--trail)"
                  strokeWidth="3"
                  vectorEffect="non-scaling-stroke"
                />
                <text
                  x="13"
                  y={index % 2 === 0 ? 4 : -12}
                  fill="var(--foreground)"
                  fontSize="13"
                  fontWeight="700"
                  paintOrder="stroke"
                  stroke="var(--canvas)"
                  strokeWidth="5"
                  strokeLinejoin="round"
                >
                  {point.name}
                </text>
              </g>
            ))
          : null}
      </svg>

      <div className="absolute bottom-4 right-4 flex items-center rounded-md border bg-popover/95 p-1 shadow-sm backdrop-blur-sm">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={zoomOut}
              aria-label="Zoom out"
            >
              <Minus aria-hidden="true" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Zoom out</TooltipContent>
        </Tooltip>
        <button
          type="button"
          onClick={resetZoom}
          className="focus-ring min-w-14 rounded px-2 py-1 font-mono text-[11px] tabular-nums text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label={`Reset zoom, currently ${Math.round(zoom * 100)} percent`}
        >
          {Math.round(zoom * 100)}%
        </button>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={zoomIn}
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
              onClick={resetZoom}
              aria-label="Fit map to view"
            >
              <LocateFixed aria-hidden="true" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Fit to view</TooltipContent>
        </Tooltip>
      </div>

      <div className="absolute bottom-4 left-4 hidden border-l-2 border-terrain bg-popover/90 px-3 py-2 text-[11px] shadow-sm backdrop-blur-sm sm:block">
        <span className="block font-mono uppercase tracking-[0.12em] text-muted-foreground">
          Concept terrain
        </span>
        <strong className="font-mono font-medium">20 m contours</strong>
      </div>

      <p className="sr-only" aria-live="polite">
        Canvas zoom is {Math.round(zoom * 100)} percent. Route winding is {amplitude}
        meters.
      </p>
    </section>
  );
}
