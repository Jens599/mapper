"use client";

import {
  CarFront,
  Footprints,
  MapPin,
  Mountain,
  Plane,
  Plus,
  Ship,
  TrainFront,
} from "lucide-react";

import { NoiseControl } from "@/components/editor/noise-control";
import { TrailObjectPanel } from "@/components/editor/trail-object-panel";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import type { TravelLeg, TravelStop } from "@/lib/project-schema";
import { cn } from "@/lib/utils";
import { useEditorStore } from "@/store/editor-store";

const modeIcons = {
  walk: Footprints,
  drive: CarFront,
  flight: Plane,
  train: TrainFront,
  boat: Ship,
} as const;

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <li className="border-b border-sidebar-border bg-muted/35 px-3 py-1.5 font-mono text-[9px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
      {children}
    </li>
  );
}

function ObjectRow({
  id,
  name,
  detail,
  visible,
  index,
  icon: Icon,
  accent,
}: {
  id: string;
  name: string;
  detail: string;
  visible: boolean;
  index: number;
  icon: typeof MapPin;
  accent?: "trail" | "water" | "terrain";
}) {
  const selectedObjectId = useEditorStore((state) => state.selectedObjectId);
  const selectObject = useEditorStore((state) => state.selectObject);
  const toggleObjectVisibility = useEditorStore(
    (state) => state.toggleObjectVisibility,
  );
  const selected = selectedObjectId === id;

  return (
    <li
      className={cn(
        "grid grid-cols-[1.6rem_1fr_2rem] items-center border-b border-sidebar-border",
        selected && "bg-sidebar-accent",
      )}
    >
      <span
        className="self-stretch border-r border-sidebar-border pt-3 text-center font-mono text-[9px] text-muted-foreground"
        aria-hidden="true"
      >
        {index}
      </span>
      <button
        type="button"
        onClick={() => selectObject(id)}
        aria-current={selected ? "true" : undefined}
        className="focus-ring flex min-h-12 min-w-0 items-center gap-2 px-2 text-left"
      >
        <Icon
          className={cn(
            "size-4 shrink-0 text-muted-foreground",
            accent === "trail" && "text-trail",
            accent === "water" && "text-water",
            accent === "terrain" && "text-terrain",
          )}
          strokeWidth={1.8}
          aria-hidden="true"
        />
        <span className="min-w-0">
          <span className="block truncate text-[13px] font-semibold">{name}</span>
          <span className="block truncate font-mono text-[9px] uppercase tracking-[0.08em] text-muted-foreground">
            {detail}
          </span>
        </span>
      </button>
      <Switch
        checked={visible}
        onCheckedChange={() => toggleObjectVisibility(id)}
        aria-label={`${visible ? "Hide" : "Show"} ${name}`}
        className="scale-75"
      />
    </li>
  );
}

function StopProperties({
  stop,
  idPrefix,
}: {
  stop: TravelStop;
  idPrefix: string;
}) {
  return (
    <section
      aria-labelledby={`${idPrefix}stop-properties`}
      className="grid gap-4 p-4"
    >
      <div>
        <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-trail">
          Itinerary stop
        </p>
        <h2 id={`${idPrefix}stop-properties`} className="mt-1 text-sm font-bold">
          {stop.name}
        </h2>
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
        <div>
          <dt className="text-muted-foreground">Schedule</dt>
          <dd className="font-mono font-medium">{stop.dayLabel}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Symbol</dt>
          <dd className="font-mono font-medium capitalize">{stop.icon}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Longitude</dt>
          <dd className="font-mono tabular-nums">{stop.coordinates[0].toFixed(4)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Latitude</dt>
          <dd className="font-mono tabular-nums">{stop.coordinates[1].toFixed(4)}</dd>
        </div>
        {stop.elevation ? (
          <div>
            <dt className="text-muted-foreground">Elevation</dt>
            <dd className="font-mono tabular-nums">{stop.elevation} m</dd>
          </div>
        ) : null}
      </dl>
      <p className="border-l-2 border-water pl-3 text-xs leading-5 text-muted-foreground">
        Drag editing and place search will be added to this geographic stop.
      </p>
    </section>
  );
}

function LegProperties({
  leg,
  idPrefix,
  stopNames,
}: {
  leg: TravelLeg;
  idPrefix: string;
  stopNames: Map<string, string>;
}) {
  const updateLegStyle = useEditorStore((state) => state.updateLegStyle);

  return (
    <section
      aria-labelledby={`${idPrefix}leg-properties`}
      className="grid gap-5 p-4"
    >
      <div>
        <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-trail">
          {leg.mode} leg
        </p>
        <h2 id={`${idPrefix}leg-properties`} className="mt-1 text-sm font-bold">
          {leg.name}
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {stopNames.get(leg.from)} to {stopNames.get(leg.to)}
        </p>
      </div>
      <NoiseControl
        id={`${idPrefix}curvature`}
        label="Route curve"
        value={leg.style.curvature}
        min={-1}
        max={1}
        step={0.02}
        onChange={(value) => updateLegStyle(leg.id, "curvature", value)}
      />
      <NoiseControl
        id={`${idPrefix}winding`}
        label="Hand-drawn winding"
        value={leg.style.winding}
        min={0}
        max={1}
        step={0.02}
        onChange={(value) => updateLegStyle(leg.id, "winding", value)}
      />
      <dl className="grid grid-cols-2 gap-2 border-t border-sidebar-border pt-4 text-xs">
        <div>
          <dt className="text-muted-foreground">Transport</dt>
          <dd className="font-mono font-medium capitalize">{leg.mode}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Line</dt>
          <dd className="font-mono font-medium capitalize">{leg.style.line}</dd>
        </div>
      </dl>
    </section>
  );
}

function TerrainProperties({ idPrefix }: { idPrefix: string }) {
  const mapSettings = useEditorStore((state) =>
    state.project.kind === "travel" ? state.project.map : null,
  );
  const toggleContours = useEditorStore((state) => state.toggleContours);
  const toggleHillshade = useEditorStore((state) => state.toggleHillshade);

  if (!mapSettings) return null;

  return (
    <section
      aria-labelledby={`${idPrefix}terrain-properties`}
      className="grid gap-4 p-4"
    >
      <div>
        <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-terrain">
          Open elevation data
        </p>
        <h2 id={`${idPrefix}terrain-properties`} className="mt-1 text-sm font-bold">
          Terrain context
        </h2>
      </div>
      <label className="flex min-h-8 items-center justify-between gap-3 text-sm">
        Contour lines
        <Switch checked={mapSettings.showContours} onCheckedChange={toggleContours} />
      </label>
      <label className="flex min-h-8 items-center justify-between gap-3 text-sm">
        Hillshade
        <Switch checked={mapSettings.showHillshade} onCheckedChange={toggleHillshade} />
      </label>
      <dl className="grid grid-cols-2 gap-2 border-t border-sidebar-border pt-4 text-xs">
        <div>
          <dt className="text-muted-foreground">Interval</dt>
          <dd className="font-mono">{mapSettings.contourInterval} m</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Source</dt>
          <dd className="font-mono">Mapzen DEM</dd>
        </div>
      </dl>
    </section>
  );
}

function SelectedProperties({ idPrefix }: { idPrefix: string }) {
  const project = useEditorStore((state) => state.project);
  const selectedObjectId = useEditorStore((state) => state.selectedObjectId);
  if (project.kind !== "travel") return null;

  if (selectedObjectId === "terrain-context") {
    return <TerrainProperties idPrefix={idPrefix} />;
  }

  const stop = project.stops.find((item) => item.id === selectedObjectId);
  if (stop) return <StopProperties stop={stop} idPrefix={idPrefix} />;

  const leg = project.legs.find((item) => item.id === selectedObjectId);
  if (leg) {
    return (
      <LegProperties
        leg={leg}
        idPrefix={idPrefix}
        stopNames={new Map(project.stops.map((item) => [item.id, item.name]))}
      />
    );
  }

  return (
    <p className="p-4 text-sm text-muted-foreground">
      Select a stop, travel leg, or terrain layer to edit it.
    </p>
  );
}

export function ObjectPanel({
  idPrefix = "",
  showAddAction = true,
}: {
  idPrefix?: string;
  showAddAction?: boolean;
}) {
  const project = useEditorStore((state) => state.project);
  const selectedObjectId = useEditorStore((state) => state.selectedObjectId);
  const selectObject = useEditorStore((state) => state.selectObject);

  if (project.kind !== "travel") {
    return <TrailObjectPanel idPrefix={idPrefix} />;
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex min-h-12 shrink-0 items-center justify-between border-b border-sidebar-border px-3">
        <div className="min-w-0 py-1.5">
          <p className="truncate text-sm font-bold">{project.name}</p>
          <p className="font-mono text-[9px] uppercase tracking-[0.13em] text-muted-foreground">
            {project.durationDays} days · travel map
          </p>
        </div>
        {showAddAction ? (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Add itinerary object"
            disabled
          >
            <Plus aria-hidden="true" />
          </Button>
        ) : null}
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <nav aria-label="Itinerary objects">
          <ol>
            <SectionLabel>Stops</SectionLabel>
            {project.stops.map((stop, index) => (
              <ObjectRow
                key={stop.id}
                id={stop.id}
                name={stop.name}
                detail={stop.dayLabel}
                visible={stop.visible}
                index={index + 1}
                icon={MapPin}
                accent="trail"
              />
            ))}
            <SectionLabel>Travel legs</SectionLabel>
            {project.legs.map((leg, index) => (
              <ObjectRow
                key={leg.id}
                id={leg.id}
                name={leg.name}
                detail={`${leg.mode} · ${leg.style.line}`}
                visible={leg.visible}
                index={index + 1}
                icon={modeIcons[leg.mode]}
                accent={leg.mode === "flight" ? "water" : "trail"}
              />
            ))}
            <SectionLabel>Map context</SectionLabel>
            <li
              className={cn(
                "grid grid-cols-[1.6rem_1fr_2rem] items-center border-b border-sidebar-border",
                selectedObjectId === "terrain-context" && "bg-sidebar-accent",
              )}
            >
              <span className="self-stretch border-r border-sidebar-border" />
              <button
                type="button"
                onClick={() => selectObject("terrain-context")}
                aria-current={
                  selectedObjectId === "terrain-context" ? "true" : undefined
                }
                className="focus-ring flex min-h-12 items-center gap-2 px-2 text-left"
              >
                <Mountain className="size-4 text-terrain" aria-hidden="true" />
                <span>
                  <span className="block text-[13px] font-semibold">Terrain</span>
                  <span className="block font-mono text-[9px] uppercase tracking-[0.08em] text-muted-foreground">
                    DEM contours
                  </span>
                </span>
              </button>
              <Switch
                checked={project.map.showContours}
                onCheckedChange={() => useEditorStore.getState().toggleContours()}
                aria-label={`${project.map.showContours ? "Hide" : "Show"} contours`}
                className="scale-75"
              />
            </li>
          </ol>
        </nav>
        <Separator />
        <SelectedProperties idPrefix={idPrefix} />
      </ScrollArea>
    </div>
  );
}
