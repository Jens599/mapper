"use client";

import { LocateFixed, Minus, Plus } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { getIconSvg, getPointIconSvg, sizeIconSvg } from "@/lib/builtin-icons";
import { foregroundFromBackground, mutedFromBackground } from "@/lib/color-utils";
import { generateTrailScatter } from "@/lib/scatter";
import { generateConceptContours, generateTrailRoute } from "@/lib/trail-geometry";
import { useEditorStore } from "@/store/editor-store";

export function TrailCanvas() {
  const project = useEditorStore((state) => state.project);
  const selectObject = useEditorStore((state) => state.selectObject);
  const moveTrailObject = useEditorStore((state) => state.moveTrailObject);
  const [zoom, setZoom] = useState(1);
  const [titleVisible, setTitleVisible] = useState(true);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  if (project.kind !== "trail") return null;

  const viewWidth = project.canvas.width / zoom;
  const viewHeight = project.canvas.height / zoom;
  const viewX = (project.canvas.width - viewWidth) / 2;
  const viewY = (project.canvas.height - viewHeight) / 2;
  const contourPaths = project.terrain.visible
    ? generateConceptContours(project)
    : [];
  const { lineScale, textScale, symbolScale } = project.presentation;
  const canvasFg = foregroundFromBackground(project.canvas.background);
  const canvasMuted = mutedFromBackground(project.canvas.background);

  function pointerPosition(event: React.PointerEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    const matrix = svg?.getScreenCTM();
    if (!svg || !matrix) return null;
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    return point.matrixTransform(matrix.inverse());
  }

  return (
    <section
      aria-label="Conceptual trail sketch"
      data-export-root
      className="canvas-grid relative min-h-0 flex-1 overflow-hidden outline-none focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring/60"
      style={{ "--canvas-bg": project.canvas.background, "--canvas-fg": canvasFg, "--canvas-muted": canvasMuted } as React.CSSProperties}
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "0") setZoom(1);
        if (event.key === "+" || event.key === "=") setZoom((value) => Math.min(2.5, value + 0.1));
        if (event.key === "-") setZoom((value) => Math.max(0.5, value - 0.1));
      }}
    >
      <svg
        ref={svgRef}
        data-export-canvas
        role="img"
        aria-labelledby="trail-title trail-description"
        viewBox={`${viewX} ${viewY} ${viewWidth} ${viewHeight}`}
        className="absolute inset-0 size-full"
        onPointerDown={(event) => {
          if (event.target === event.currentTarget) selectObject("trail-terrain");
        }}
        onPointerMove={(event) => {
          if (!draggingId) return;
          const point = pointerPosition(event);
          if (point) moveTrailObject(draggingId, { x: point.x, y: point.y });
        }}
        onPointerUp={() => setDraggingId(null)}
        onPointerCancel={() => setDraggingId(null)}
      >
        <title id="trail-title">{project.name}</title>
        <desc id="trail-description">
          A conceptual trail through {project.waypoints.length} waypoints with
          Perlin-noise winding and simulated elevation contours.
        </desc>
        <g
          fill="none"
          stroke="var(--terrain)"
          strokeWidth={1.2 * lineScale}
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
                strokeWidth={9 * lineScale}
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
              <path
                d={path}
                fill="none"
                stroke="var(--trail)"
                strokeWidth={3.5 * lineScale}
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            </g>
          );
        })}

        {project.waypoints.filter((point) => point.visible).map((point) => {
          const pointSvg = getPointIconSvg(point.iconId, project.iconAssets);
          const sizedPointSvg = pointSvg ? sizeIconSvg(pointSvg, { width: 20, height: 20, color: canvasFg }) : null;
          return (
          <g
            key={point.id}
            transform={`translate(${point.x} ${point.y})`}
            role="button"
            tabIndex={0}
            aria-label={`${point.name}${point.elevation ? `, ${point.elevation} ${project.units}` : ""}`}
            onClick={() => selectObject(point.id)}
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              setDraggingId(point.id);
              selectObject(point.id);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                selectObject(point.id);
              }
            }}
            className="cursor-pointer outline-none focus-visible:[&_circle]:stroke-water"
          >
            <circle
              r="11"
              fill="var(--canvas-muted, var(--card))"
              stroke="var(--canvas-fg, var(--trail))"
              strokeWidth="3"
              vectorEffect="non-scaling-stroke"
            />
            {sizedPointSvg ? (
              <g transform="translate(-10 -10)" fill="var(--canvas-fg, var(--trail))" color="var(--canvas-fg, var(--trail))" dangerouslySetInnerHTML={{ __html: sizedPointSvg }} />
            ) : null}
            <text
              x="13"
              y="4"
              fill="var(--canvas-fg, var(--foreground))"
              fontSize={13 * textScale}
              fontWeight="700"
              paintOrder="stroke"
              stroke="var(--canvas-bg, var(--canvas))"
              strokeWidth="5"
              strokeLinejoin="round"
            >
              {point.name}
            </text>
          </g>
          );
        })}

        {project.icons.filter((icon) => icon.visible).map((icon) => {
          const svg = getIconSvg(icon.iconId, project.iconAssets);
          if (!svg) return null;
          const sizedSvg = sizeIconSvg(svg, { width: 32, height: 32, color: canvasFg });
          return (
            <g
              key={icon.id}
              transform={`translate(${icon.x} ${icon.y}) rotate(${icon.rotation}) scale(${icon.scale * symbolScale}) translate(-16 -16)`}
              fill="var(--canvas-fg, var(--foreground))"
              aria-label={icon.iconId}
              onPointerDown={(event) => {
                event.currentTarget.setPointerCapture(event.pointerId);
                setDraggingId(icon.id);
                selectObject(icon.id);
              }}
              className="cursor-move"
              dangerouslySetInnerHTML={{ __html: sizedSvg }}
            />
          );
        })}

        {project.scatter.filter((scatter) => scatter.visible).flatMap((scatter) =>
          generateTrailScatter(project, scatter).map((placement) => {
            const svg = getIconSvg(placement.iconId, project.iconAssets);
            if (!svg) return null;
            const sizedSvg = sizeIconSvg(svg, { width: 32, height: 32, color: canvasFg });
            return (
              <g
                key={placement.id}
                transform={`translate(${placement.x} ${placement.y}) rotate(${placement.rotation}) scale(${placement.scale * symbolScale}) translate(-16 -16)`}
                onClick={() => selectObject(scatter.id)}
                className="cursor-pointer"
                dangerouslySetInnerHTML={{ __html: sizedSvg }}
              />
            );
          }),
        )}
      </svg>

      {titleVisible ? (
        <div className="pointer-events-none absolute left-4 top-4 border-l-4 border-trail bg-popover/94 px-4 py-3 shadow-md backdrop-blur-sm">
          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
            Conceptual trail sketch
          </p>
          <h2 className="text-lg font-extrabold tracking-tight">{project.name}</h2>
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
