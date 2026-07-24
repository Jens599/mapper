"use client";

import { LocateFixed, Minus, Plus, RotateCcw } from "lucide-react";
import { Noise } from "noisejs";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { getIconSvg, getPointIconSvg, sizeIconSvg } from "@/lib/builtin-icons";
import type { Coordinate, TravelProject, TravelScatter } from "@/lib/project-schema";
import { generateTravelScatter, geographicToSymbolic } from "@/lib/scatter";
import { getSymbolicStopPositions } from "@/lib/travel-geometry";
import { useEditorStore } from "@/store/editor-store";

function buildSymbolicLegPath(
  start: { x: number; y: number },
  control: { x: number; y: number },
  end: { x: number; y: number },
  style: TravelProject["legs"][number]["style"],
) {
  const noise = new Noise(style.noiseSeed);
  return Array.from({ length: 49 }, (_, index) => {
    const progress = index / 48;
    const inverse = 1 - progress;
    const baseX = inverse * inverse * start.x + 2 * inverse * progress * control.x + progress * progress * end.x;
    const baseY = inverse * inverse * start.y + 2 * inverse * progress * control.y + progress * progress * end.y;
    const tangentX = 2 * inverse * (control.x - start.x) + 2 * progress * (end.x - control.x);
    const tangentY = 2 * inverse * (control.y - start.y) + 2 * progress * (end.y - control.y);
    const tangentLength = Math.hypot(tangentX, tangentY) || 1;
    let frequency = style.noiseScale;
    let amplitude = 1;
    let total = 0;
    let normalization = 0;
    for (let octave = 0; octave < style.noiseOctaves; octave += 1) {
      total += noise.perlin2(progress * frequency, 17) * amplitude;
      normalization += amplitude;
      frequency *= 2;
      amplitude *= 0.5;
    }
    const envelope = Math.sin(Math.PI * progress);
    const modulation = 1 + noise.perlin2(progress * style.noiseScale * 0.5, 71) * style.noiseModulation;
    const offset =
      envelope * Math.sin(progress * Math.PI * 6) * style.winding * 12 +
      envelope * (total / Math.max(0.001, normalization)) * style.noiseAmplitude * 34 * modulation;
    const x = baseX + (-tangentY / tangentLength) * offset;
    const y = baseY + (tangentX / tangentLength) * offset;
    return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(" ");
}

function symbolicScatterPosition(
  project: TravelProject,
  scatter: TravelScatter,
  coordinates: Coordinate,
  positions: Map<string, { x: number; y: number }>,
) {
  const projected = geographicToSymbolic(project, coordinates);
  if (scatter.region.type === "around-stop") {
    const region = scatter.region;
    const stop = project.stops.find((item) => item.id === region.stopId);
    const position = positions.get(region.stopId);
    if (!stop || !position) return projected;
    const original = geographicToSymbolic(project, stop.coordinates);
    return { x: position.x + projected.x - original.x, y: position.y + projected.y - original.y };
  }
  if (scatter.region.type === "along-leg") {
    const region = scatter.region;
    const leg = project.legs.find((item) => item.id === region.legId);
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
  const resetSymbolicLayout = useEditorStore((state) => state.resetSymbolicLayout);
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState<{
    id: string;
    type: "stop" | "symbol";
  } | null>(null);
  const [viewport, setViewport] = useState({ centerX: 500, centerY: 350, zoom: 1 });
  const [panning, setPanning] = useState<{
    clientX: number;
    clientY: number;
  } | null>(null);
  const positions = getSymbolicStopPositions(project);
  const { lineScale, textScale, symbolScale } = project.presentation;
  const viewWidth = 1000 / viewport.zoom;
  const viewHeight = 700 / viewport.zoom;

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const zoomWithWheel = (event: WheelEvent) => {
      event.preventDefault();
      setViewport((current) => ({
        ...current,
        zoom: Math.min(3, Math.max(0.5, current.zoom + (event.deltaY < 0 ? 0.12 : -0.12))),
      }));
    };
    svg.addEventListener("wheel", zoomWithWheel, { passive: false });
    return () => svg.removeEventListener("wheel", zoomWithWheel);
  }, []);

  function changeZoom(nextZoom: number) {
    setViewport((current) => ({
      ...current,
      zoom: Math.min(3, Math.max(0.5, nextZoom)),
    }));
  }

  function fitToScreen() {
    const points = project.stops
      .filter((stop) => stop.visible)
      .flatMap((stop) => {
        const position = positions.get(stop.id);
        return position
          ? [
              { x: position.x - 88, y: position.y - 55 },
              { x: position.x + 88, y: position.y + 55 },
            ]
          : [];
      });
    for (const leg of project.legs.filter((item) => item.visible)) {
      const start = positions.get(leg.from);
      const end = positions.get(leg.to);
      if (!start || !end) continue;
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const length = Math.hypot(dx, dy) || 1;
      const bend = leg.style.curvature * Math.min(120, length * 0.3);
      const margin = 48 + leg.style.winding * 12 + leg.style.noiseAmplitude * 34;
      const control = {
        x: (start.x + end.x) / 2 + (-dy / length) * bend,
        y: (start.y + end.y) / 2 + (dx / length) * bend,
      };
      points.push(
        start,
        end,
        { x: control.x - margin, y: control.y - margin },
        { x: control.x + margin, y: control.y + margin },
      );
    }
    for (const symbol of project.symbols.filter((item) => item.visible)) {
      const point = symbol.diagramPosition ?? geographicToSymbolic(project, symbol.coordinates);
      const radius = 20 * symbol.scale * symbolScale;
      points.push({ x: point.x - radius, y: point.y - radius }, { x: point.x + radius, y: point.y + radius });
    }
    for (const scatter of project.scatter.filter((item) => item.visible)) {
      for (const placement of generateTravelScatter(project, scatter)) {
        const point = symbolicScatterPosition(project, scatter, placement.coordinates, positions);
        const radius = 20 * placement.scale * symbolScale;
        points.push({ x: point.x - radius, y: point.y - radius }, { x: point.x + radius, y: point.y + radius });
      }
    }
    if (!points.length) {
      setViewport({ centerX: 500, centerY: 350, zoom: 1 });
      return;
    }
    const left = Math.min(...points.map((point) => point.x));
    const right = Math.max(...points.map((point) => point.x));
    const top = Math.min(...points.map((point) => point.y));
    const bottom = Math.max(...points.map((point) => point.y));
    setViewport({
      centerX: (left + right) / 2,
      centerY: (top + bottom) / 2,
      zoom: Math.min(3, Math.max(0.5, Math.min(820 / Math.max(160, right - left), 560 / Math.max(120, bottom - top)))),
    });
  }

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
      aria-label="No map travel itinerary"
      data-export-root
      className="canvas-grid relative min-h-0 flex-1 overflow-hidden outline-none focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring/60"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "0") fitToScreen();
        if (event.key === "+" || event.key === "=") changeZoom(viewport.zoom + 0.15);
        if (event.key === "-") changeZoom(viewport.zoom - 0.15);
      }}
    >
      <svg
        ref={svgRef}
        data-export-canvas
        role="img"
        aria-labelledby="symbolic-title symbolic-description"
        viewBox={`${viewport.centerX - viewWidth / 2} ${viewport.centerY - viewHeight / 2} ${viewWidth} ${viewHeight}`}
        className="absolute inset-0 size-full"
        onPointerDown={(event) => {
          if (event.target !== event.currentTarget) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          setPanning({
            clientX: event.clientX,
            clientY: event.clientY,
          });
        }}
        onPointerMove={(event) => {
          if (panning) {
            const matrix = event.currentTarget.getScreenCTM();
            if (!matrix) return;
            const previous = event.currentTarget.createSVGPoint();
            previous.x = panning.clientX;
            previous.y = panning.clientY;
            const previousWorld = previous.matrixTransform(matrix.inverse());
            const currentWorld = pointerPosition(event);
            if (!currentWorld) return;
            setViewport((current) => ({
              ...current,
              centerX: current.centerX + previousWorld.x - currentWorld.x,
              centerY: current.centerY + previousWorld.y - currentWorld.y,
            }));
            setPanning({ clientX: event.clientX, clientY: event.clientY });
            return;
          }
          if (!dragging) return;
          const point = pointerPosition(event);
          if (!point) return;
          if (dragging.type === "stop") {
            moveSymbolicStop(dragging.id, { x: point.x, y: point.y });
          } else {
            moveSymbolicSymbol(dragging.id, { x: point.x, y: point.y });
          }
        }}
        onPointerUp={() => {
          setDragging(null);
          setPanning(null);
        }}
        onPointerCancel={() => {
          setDragging(null);
          setPanning(null);
        }}
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
          const startTangentLength = Math.hypot(cx - start.x, cy - start.y) || 1;
          const endTangentLength = Math.hypot(end.x - cx, end.y - cy) || 1;
          const routeStart = {
            x: start.x + ((cx - start.x) / startTangentLength) * 12,
            y: start.y + ((cy - start.y) / startTangentLength) * 12,
          };
          const routeEnd = {
            x: end.x - ((end.x - cx) / endTangentLength) * 26,
            y: end.y - ((end.y - cy) / endTangentLength) * 26,
          };
          const path = buildSymbolicLegPath(routeStart, { x: cx, y: cy }, routeEnd, leg.style);
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
                strokeDasharray={leg.style.line === "dashed" ? "10 9" : leg.style.line === "dotted" ? "1 7" : undefined}
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
          const iconSvg = getPointIconSvg(stop.icon, project.iconAssets);
          const sizedIcon = iconSvg ? sizeIconSvg(iconSvg, { width: 20, height: 20 }) : null;
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
              <circle r="12" fill="var(--trail)" stroke="var(--card)" strokeWidth="4" />
              {sizedIcon ? (
                <g transform="translate(-10 -10)" fill="white" color="white" dangerouslySetInnerHTML={{ __html: sizedIcon }} />
              ) : null}
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
          const sizedSvg = sizeIconSvg(svg, { width: 32, height: 32 });
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
            const sizedSvg = sizeIconSvg(svg, { width: 32, height: 32 });
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
          No map itinerary · not to scale
        </p>
        <h2 className="text-lg font-extrabold tracking-tight">{project.name}</h2>
      </div>

      <div className="absolute right-4 top-4 flex items-center rounded-md border bg-popover/95 p-1 shadow-sm">
        <Button variant="ghost" size="icon-sm" onClick={() => changeZoom(viewport.zoom - 0.15)} aria-label="Zoom out"><Minus aria-hidden="true" /></Button>
        <span className="min-w-12 text-center font-mono text-[10px]">{Math.round(viewport.zoom * 100)}%</span>
        <Button variant="ghost" size="icon-sm" onClick={() => changeZoom(viewport.zoom + 0.15)} aria-label="Zoom in"><Plus aria-hidden="true" /></Button>
        <Button variant="ghost" size="icon-sm" onClick={fitToScreen} aria-label="Fit No map itinerary to screen"><LocateFixed aria-hidden="true" /></Button>
        <Button variant="ghost" size="icon-sm" onClick={() => {
          resetSymbolicLayout();
          setViewport({ centerX: 500, centerY: 350, zoom: 1 });
        }} aria-label="Reset No map layout"><RotateCcw aria-hidden="true" /></Button>
      </div>
    </section>
  );
}
