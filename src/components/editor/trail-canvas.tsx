"use client";

import { LocateFixed, Minus, Plus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { generateConceptContours, generateTrailRoute } from "@/lib/trail-geometry";
import { useEditorStore } from "@/store/editor-store";

export function TrailCanvas() {
  const project = useEditorStore((state) => state.project);
  const selectObject = useEditorStore((state) => state.selectObject);
  const [zoom, setZoom] = useState(1);

  if (project.kind !== "trail") return null;

  const viewWidth = project.canvas.width / zoom;
  const viewHeight = project.canvas.height / zoom;
  const viewX = (project.canvas.width - viewWidth) / 2;
  const viewY = (project.canvas.height - viewHeight) / 2;
  const contourPaths = project.terrain.visible
    ? generateConceptContours(project)
    : [];

  return (
    <section
      aria-label="Conceptual trail sketch"
      data-export-root
      className="canvas-grid relative min-h-0 flex-1 overflow-hidden"
    >
      <svg
        data-export-canvas
        role="img"
        aria-labelledby="trail-title trail-description"
        viewBox={`${viewX} ${viewY} ${viewWidth} ${viewHeight}`}
        className="absolute inset-0 size-full"
      >
        <title id="trail-title">{project.name}</title>
        <desc id="trail-description">
          A conceptual trail through {project.waypoints.length} waypoints with
          Perlin-noise winding and simulated elevation contours.
        </desc>
        <g
          fill="none"
          stroke="var(--terrain)"
          strokeWidth="1.2"
          opacity={project.terrain.opacity}
          vectorEffect="non-scaling-stroke"
          aria-hidden="true"
        >
          {contourPaths.map((path, index) => (
            <path key={index} d={path} />
          ))}
        </g>

        {project.routes.filter((route) => route.visible).map((route) => {
          const points = generateTrailRoute(project, route);
          const path = points
            .map(([x, y], index) => `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`)
            .join(" ");
          return (
            <g key={route.id}>
              <path
                d={path}
                fill="none"
                stroke="var(--card)"
                strokeWidth="9"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
              <path
                d={path}
                fill="none"
                stroke="var(--trail)"
                strokeWidth="3.5"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            </g>
          );
        })}

        {project.waypoints.filter((point) => point.visible).map((point) => (
          <g
            key={point.id}
            transform={`translate(${point.x} ${point.y})`}
            role="button"
            tabIndex={0}
            aria-label={`${point.name}${point.elevation ? `, ${point.elevation} ${project.units}` : ""}`}
            onClick={() => selectObject(point.id)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                selectObject(point.id);
              }
            }}
            className="cursor-pointer outline-none focus-visible:[&_circle]:stroke-water"
          >
            <circle
              r="8"
              fill="var(--card)"
              stroke="var(--trail)"
              strokeWidth="3"
              vectorEffect="non-scaling-stroke"
            />
            <text
              x="13"
              y="4"
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
        ))}

        {project.icons.filter((icon) => icon.visible).map((icon) => (
          <g
            key={icon.id}
            transform={`translate(${icon.x} ${icon.y}) rotate(${icon.rotation}) scale(${icon.scale})`}
            fill="var(--foreground)"
            aria-label={icon.iconId}
          >
            {icon.iconId === "camp" ? (
              <path d="M-12 9 0-12 12 9H6L0-2-6 9Z" />
            ) : (
              <path d="M-15 2C-8-6-1-3 3-7 8-11 13-6 16-1 9-4 4 1-2 1-7 1-10 5-15 2Z" fill="var(--water)" />
            )}
          </g>
        ))}
      </svg>

      <div className="pointer-events-none absolute left-4 top-4 border-l-4 border-trail bg-popover/94 px-4 py-3 shadow-md backdrop-blur-sm">
        <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
          Conceptual trail sketch
        </p>
        <h2 className="text-lg font-extrabold tracking-tight">{project.name}</h2>
      </div>

      <div className="absolute right-4 top-4 flex items-center rounded-md border bg-popover/95 p-1 shadow-sm">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setZoom((value) => Math.max(0.5, value - 0.1))}
          aria-label="Zoom out"
        >
          <Minus aria-hidden="true" />
        </Button>
        <span className="min-w-12 text-center font-mono text-[10px]">
          {Math.round(zoom * 100)}%
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setZoom((value) => Math.min(2.5, value + 0.1))}
          aria-label="Zoom in"
        >
          <Plus aria-hidden="true" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setZoom(1)}
          aria-label="Fit trail to view"
        >
          <LocateFixed aria-hidden="true" />
        </Button>
      </div>
    </section>
  );
}
