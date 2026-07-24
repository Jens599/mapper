"use client";

import { useRef, useState } from "react";

import { getIconSvg } from "@/lib/builtin-icons";
import type { Coordinate, TravelProject, TravelScatter } from "@/lib/project-schema";
import { generateTravelScatter, geographicToSymbolic } from "@/lib/scatter";
import { getSymbolicStopPositions } from "@/lib/travel-geometry";
import { useEditorStore } from "@/store/editor-store";

function symbolicScatterPosition(
  project: TravelProject,
  scatter: TravelScatter,
  coordinates: Coordinate,
  positions: Map<string, { x: number; y: number }>,
) {
  const projected = geographicToSymbolic(project, coordinates);
  if (scatter.region.type === "around-stop") {
    const stop = project.stops.find((item) => item.id === scatter.region.stopId);
    const position = positions.get(scatter.region.stopId);
    if (!stop || !position) return projected;
    const original = geographicToSymbolic(project, stop.coordinates);
    return { x: position.x + projected.x - original.x, y: position.y + projected.y - original.y };
  }
  if (scatter.region.type === "along-leg") {
    const leg = project.legs.find((item) => item.id === scatter.region.legId);
    if (!leg) return projected;
    const start = positions.get(leg.from);
    const end = positions.get(leg.to);
    const from = project.stops.find((item) => item.id === leg.from);
    const to = project.stops.find((item) => item.id === leg.to);
    if (!start || !end || !from || !to) return projected;
    const projectedStart = geographicToSymbolic(project, from.coordinates);
    const projectedEnd = geographicToSymbolic(project, to.coordinates);
    const dx = projectedEnd.x - projectedStart.x;
    const dy = projectedEnd.y - projectedStart.y;
    const lengthSquared = dx * dx + dy * dy || 1;
    const progress = Math.max(
      0,
      Math.min(
        1,
        ((projected.x - projectedStart.x) * dx + (projected.y - projectedStart.y) * dy) /
          lengthSquared,
      ),
    );
    const projectedBase = {
      x: projectedStart.x + dx * progress,
      y: projectedStart.y + dy * progress,
    };
    const routeDx = end.x - start.x;
    const routeDy = end.y - start.y;
    const routeLength = Math.hypot(routeDx, routeDy) || 1;
    const routeNormal = { x: -routeDy / routeLength, y: routeDx / routeLength };
    const bend = leg.style.curvature * Math.min(120, routeLength * 0.3);
    const control = {
      x: (start.x + end.x) / 2 + routeNormal.x * bend,
      y: (start.y + end.y) / 2 + routeNormal.y * bend,
    };
    const inverse = 1 - progress;
    const curvePoint = {
      x:
        inverse * inverse * start.x +
        2 * inverse * progress * control.x +
        progress * progress * end.x,
      y:
        inverse * inverse * start.y +
        2 * inverse * progress * control.y +
        progress * progress * end.y,
    };
    const tangent = {
      x: 2 * inverse * (control.x - start.x) + 2 * progress * (end.x - control.x),
      y: 2 * inverse * (control.y - start.y) + 2 * progress * (end.y - control.y),
    };
    const tangentLength = Math.hypot(tangent.x, tangent.y) || 1;
    const curveNormal = { x: -tangent.y / tangentLength, y: tangent.x / tangentLength };
    const projectedLength = Math.hypot(dx, dy) || 1;
    const projectedNormal = { x: -dy / projectedLength, y: dx / projectedLength };
    const corridorOffset =
      (projected.x - projectedBase.x) * projectedNormal.x +
      (projected.y - projectedBase.y) * projectedNormal.y;
    return {
      x: curvePoint.x + curveNormal.x * corridorOffset,
      y: curvePoint.y + curveNormal.y * corridorOffset,
    };
  }
  return projected;
}

export function SymbolicTravelCanvas({ project }: { project: TravelProject }) {
  const selectObject = useEditorStore((state) => state.selectObject);
  const selectedObjectId = useEditorStore((state) => state.selectedObjectId);
  const moveSymbolicStop = useEditorStore((state) => state.moveSymbolicStop);
  const moveSymbolicSymbol = useEditorStore((state) => state.moveSymbolicSymbol);
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState<{
    id: string;
    type: "stop" | "symbol";
  } | null>(null);
  const positions = getSymbolicStopPositions(project);
  const { lineScale, textScale, symbolScale } = project.presentation;

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
      aria-label="Symbolic travel itinerary"
      data-export-root
      className="canvas-grid relative min-h-0 flex-1 overflow-hidden"
    >
      <svg
        ref={svgRef}
        data-export-canvas
        role="img"
        aria-labelledby="symbolic-title symbolic-description"
        viewBox="0 0 1000 700"
        className="absolute inset-0 size-full"
        onPointerMove={(event) => {
          if (!dragging) return;
          const point = pointerPosition(event);
          if (!point) return;
          if (dragging.type === "stop") {
            moveSymbolicStop(dragging.id, { x: point.x, y: point.y });
          } else {
            moveSymbolicSymbol(dragging.id, { x: point.x, y: point.y });
          }
        }}
        onPointerUp={() => setDragging(null)}
        onPointerCancel={() => setDragging(null)}
      >
        <title id="symbolic-title">{project.name}</title>
        <desc id="symbolic-description">
          A symbolic, automatically arranged itinerary with {project.stops.length} stops.
          Positions are illustrative and not geographically accurate.
        </desc>
        <defs>
          <marker id="symbolic-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M0 0 10 5 0 10Z" fill="context-stroke" />
          </marker>
        </defs>

        {project.legs.filter((leg) => leg.visible).map((leg, index) => {
          const start = positions.get(leg.from);
          const end = positions.get(leg.to);
          if (!start || !end) return null;
          const dx = end.x - start.x;
          const dy = end.y - start.y;
          const length = Math.hypot(dx, dy) || 1;
          const normalX = -dy / length;
          const normalY = dx / length;
          const bend = leg.style.curvature * Math.min(120, length * 0.3);
          const cx = (start.x + end.x) / 2 + normalX * bend;
          const cy = (start.y + end.y) / 2 + normalY * bend;
          const path = `M${start.x} ${start.y} Q${cx} ${cy} ${end.x} ${end.y}`;
          const modeX = (start.x + end.x) / 2 + normalX * (22 + (index % 2) * 12);
          const modeY = (start.y + end.y) / 2 + normalY * (22 + (index % 2) * 12);
          return (
            <g key={leg.id} onClick={() => selectObject(leg.id)} className="cursor-pointer">
              <path d={path} fill="none" stroke="var(--card)" strokeWidth={10 * lineScale} strokeLinecap="round" />
              <path
                d={path}
                fill="none"
                stroke={leg.style.color}
                strokeWidth={(selectedObjectId === leg.id ? 5 : 3) * lineScale}
                strokeDasharray={leg.style.line === "dashed" ? "10 9" : undefined}
                strokeLinecap="round"
                markerEnd="url(#symbolic-arrow)"
              />
              <g transform={`translate(${modeX} ${modeY})`}>
                <rect x="-28" y="-10" width="56" height="20" rx="10" fill="var(--card)" stroke={leg.style.color} />
                <text textAnchor="middle" y="3" fill="var(--foreground)" fontSize={8 * textScale} fontFamily="monospace" fontWeight="700">
                  {leg.mode.toUpperCase()}
                </text>
              </g>
            </g>
          );
        })}

        {project.stops.filter((stop) => stop.visible).map((stop, index) => {
          const position = positions.get(stop.id);
          if (!position) return null;
          const placeAbove = index % 2 === 0;
          return (
            <g
              key={stop.id}
              transform={`translate(${position.x} ${position.y})`}
              role="button"
              tabIndex={0}
              aria-label={`${stop.name}, ${stop.dayLabel}`}
              onClick={() => selectObject(stop.id)}
              onPointerDown={(event) => {
                event.currentTarget.setPointerCapture(event.pointerId);
                setDragging({ id: stop.id, type: "stop" });
                selectObject(stop.id);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") selectObject(stop.id);
              }}
              className="cursor-pointer outline-none"
            >
              <circle r="10" fill="var(--trail)" stroke="var(--card)" strokeWidth="4" />
              <g transform={`translate(0 ${placeAbove ? -24 : 25})`}>
                <rect x="-72" y={placeAbove ? -34 : 0} width="144" height="34" rx="4" fill="var(--card)" stroke="#c9d0ca" />
                <text textAnchor="middle" y={placeAbove ? -19 : 14} fill="var(--foreground)" fontSize={12 * textScale} fontWeight="700">
                  {stop.name}
                </text>
                <text textAnchor="middle" y={placeAbove ? -7 : 27} fill="var(--trail)" fontSize={9 * textScale} fontFamily="monospace" fontWeight="700">
                  {stop.dayLabel}
                </text>
              </g>
            </g>
          );
        })}

        {project.symbols.filter((symbol) => symbol.visible).map((symbol) => {
          const svg = getIconSvg(symbol.iconId, project.iconAssets);
          if (!svg) return null;
          const base = symbol.diagramPosition ?? geographicToSymbolic(project, symbol.coordinates);
          const sizedSvg = svg.replace("<svg", '<svg width="32" height="32"');
          return (
            <g
              key={symbol.id}
              transform={`translate(${base.x} ${base.y}) rotate(${symbol.rotation}) scale(${symbol.scale * symbolScale}) translate(-16 -16)`}
              onPointerDown={(event) => {
                event.currentTarget.setPointerCapture(event.pointerId);
                setDragging({ id: symbol.id, type: "symbol" });
                selectObject(symbol.id);
              }}
              className="cursor-move"
              dangerouslySetInnerHTML={{ __html: sizedSvg }}
            />
          );
        })}

        {project.scatter.filter((scatter) => scatter.visible).flatMap((scatter) =>
          generateTravelScatter(project, scatter).map((placement) => {
            const svg = getIconSvg(placement.iconId, project.iconAssets);
            if (!svg) return null;
            const position = symbolicScatterPosition(
              project,
              scatter,
              placement.coordinates,
              positions,
            );
            const sizedSvg = svg.replace("<svg", '<svg width="32" height="32"');
            return (
              <g
                key={placement.id}
                transform={`translate(${position.x} ${position.y}) rotate(${placement.rotation}) scale(${placement.scale * symbolScale}) translate(-16 -16)`}
                onClick={() => selectObject(scatter.id)}
                className="cursor-pointer"
                dangerouslySetInnerHTML={{ __html: sizedSvg }}
              />
            );
          }),
        )}
      </svg>

      <div className="pointer-events-none absolute left-4 top-4 border-l-4 border-trail bg-popover/94 px-4 py-3 shadow-md">
        <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
          Symbolic itinerary · not to scale
        </p>
        <h2 className="text-lg font-extrabold tracking-tight">{project.name}</h2>
      </div>
    </section>
  );
}
