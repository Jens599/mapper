"use client";

import {
  CarFront,
  ChevronDown,
  Footprints,
  MapPinned,
  MapPin,
  Mountain,
  PanelLeftClose,
  Plane,
  Plus,
  Ship,
  TrainFront,
} from "lucide-react";
import { useEffect, useState } from "react";

import { NoiseControl } from "@/components/editor/noise-control";
import { TrailObjectPanel } from "@/components/editor/trail-object-panel";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import type { TravelLeg, TravelScatter, TravelStop } from "@/lib/project-schema";
import { cn } from "@/lib/utils";
import { useEditorStore } from "@/store/editor-store";

const modeIcons = {
  walk: Footprints,
  drive: CarFront,
  flight: Plane,
  train: TrainFront,
  boat: Ship,
} as const;

function CollapsibleSection({
  id,
  label,
  count,
  children,
}: {
  id: string;
  label: string;
  count?: number;
  children: React.ReactNode;
}) {
  const storageKey = `mapper-section-${id}`;
  const [open, setOpen] = useState(true);

  useEffect(() => {
    setOpen(window.localStorage.getItem(storageKey) !== "closed");
  }, [storageKey]);

  return (
    <Collapsible
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        window.localStorage.setItem(storageKey, nextOpen ? "open" : "closed");
      }}
    >
      <CollapsibleTrigger className="focus-ring group flex w-full items-center gap-2 border-b border-sidebar-border bg-muted/35 px-3 py-1.5 text-left font-mono text-[9px] font-semibold uppercase tracking-[0.15em] text-muted-foreground hover:bg-muted/60">
        <ChevronDown className="size-3 transition-transform group-data-[state=closed]:-rotate-90" aria-hidden="true" />
        <span>{label}</span>
        {count !== undefined ? <span className="ml-auto tabular-nums">{count}</span> : null}
      </CollapsibleTrigger>
      <CollapsibleContent>{children}</CollapsibleContent>
    </Collapsible>
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
  onSelectComplete,
}: {
  id: string;
  name: string;
  detail: string;
  visible: boolean;
  index: number;
  icon: typeof MapPin;
  accent?: "trail" | "water" | "terrain";
  onSelectComplete?: () => void;
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
        onClick={() => {
          selectObject(id);
          onSelectComplete?.();
        }}
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
  const updateStopLabelOffset = useEditorStore(
    (state) => state.updateStopLabelOffset,
  );
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
        Drag the stop directly on the map. Adjust its label separately when nearby
        labels collide.
      </p>
      <NoiseControl
        id={`${idPrefix}label-offset-x`}
        label="Label horizontal"
        value={stop.labelOffset[0]}
        min={-160}
        max={160}
        step={1}
        unit="px"
        onChange={(value) => updateStopLabelOffset(stop.id, 0, value)}
      />
      <NoiseControl
        id={`${idPrefix}label-offset-y`}
        label="Label vertical"
        value={stop.labelOffset[1]}
        min={-120}
        max={120}
        step={1}
        unit="px"
        onChange={(value) => updateStopLabelOffset(stop.id, 1, value)}
      />
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
  const setTravelDisplay = useEditorStore((state) => state.setTravelDisplay);
  const updatePresentation = useEditorStore((state) => state.updatePresentation);
  const presentation = useEditorStore((state) => state.project.presentation);

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
      <div className="grid grid-cols-2 gap-2" role="group" aria-label="Travel presentation">
        <Button
          variant={mapSettings.display === "geographic" ? "default" : "outline"}
          size="sm"
          onClick={() => setTravelDisplay("geographic")}
          aria-pressed={mapSettings.display === "geographic"}
        >
          Geographic
        </Button>
        <Button
          variant={mapSettings.display === "symbolic" ? "default" : "outline"}
          size="sm"
          onClick={() => setTravelDisplay("symbolic")}
          aria-pressed={mapSettings.display === "symbolic"}
        >
          Symbolic
        </Button>
      </div>
      <label className="flex min-h-8 items-center justify-between gap-3 text-sm">
        Contour lines
        <Switch
          checked={mapSettings.showContours}
          onCheckedChange={toggleContours}
          disabled={mapSettings.display === "symbolic"}
        />
      </label>
      <label className="flex min-h-8 items-center justify-between gap-3 text-sm">
        Hillshade
        <Switch
          checked={mapSettings.showHillshade}
          onCheckedChange={toggleHillshade}
          disabled={mapSettings.display === "symbolic"}
        />
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
      <div className="grid gap-4 border-t pt-4">
        <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
          Presentation scale
        </p>
        <NoiseControl id={`${idPrefix}line-scale`} label="Lines" value={presentation.lineScale} min={0.25} max={4} step={0.05} onChange={(value) => updatePresentation("lineScale", value)} />
        <NoiseControl id={`${idPrefix}text-scale`} label="Text" value={presentation.textScale} min={0.5} max={3} step={0.05} onChange={(value) => updatePresentation("textScale", value)} />
        <NoiseControl id={`${idPrefix}symbol-global-scale`} label="Symbols" value={presentation.symbolScale} min={0.25} max={4} step={0.05} onChange={(value) => updatePresentation("symbolScale", value)} />
      </div>
    </section>
  );
}

function ScatterProperties({
  scatter,
  idPrefix,
}: {
  scatter: TravelScatter;
  idPrefix: string;
}) {
  return (
    <section aria-labelledby={`${idPrefix}scatter-properties`} className="grid gap-4 p-4">
      <div>
        <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-terrain">Seeded scatter rule</p>
        <h2 id={`${idPrefix}scatter-properties`} className="mt-1 text-sm font-bold">{scatter.name}</h2>
      </div>
      <dl className="grid grid-cols-2 gap-3 text-xs">
        <div><dt className="text-muted-foreground">Count</dt><dd className="font-mono">{scatter.count}</dd></div>
        <div><dt className="text-muted-foreground">Seed</dt><dd className="font-mono">{scatter.seed}</dd></div>
        <div><dt className="text-muted-foreground">Region</dt><dd className="font-mono">{scatter.region.type}</dd></div>
        <div><dt className="text-muted-foreground">Spacing</dt><dd className="font-mono">{scatter.minSpacingKm} km</dd></div>
      </dl>
      <p className="border-l-2 border-terrain pl-3 text-xs leading-5 text-muted-foreground">
        One YAML object regenerates this entire group. Edit advanced region and
        randomization values in Builder.
      </p>
    </section>
  );
}

function SymbolProperties({
  symbol,
  idPrefix,
}: {
  symbol: { id: string; iconId: string; scale: number; rotation: number };
  idPrefix: string;
}) {
  const updateSymbolTransform = useEditorStore(
    (state) => state.updateSymbolTransform,
  );
  return (
    <section aria-labelledby={`${idPrefix}symbol-properties`} className="grid gap-5 p-4">
      <div>
        <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-water">Map symbol</p>
        <h2 id={`${idPrefix}symbol-properties`} className="mt-1 text-sm font-bold">{symbol.iconId}</h2>
      </div>
      <NoiseControl
        id={`${idPrefix}symbol-scale`}
        label="Scale"
        value={symbol.scale}
        min={0.1}
        max={5}
        step={0.1}
        onChange={(value) => updateSymbolTransform(symbol.id, "scale", value)}
      />
      <NoiseControl
        id={`${idPrefix}symbol-rotation`}
        label="Rotation"
        value={symbol.rotation}
        min={-180}
        max={180}
        step={1}
        unit="°"
        onChange={(value) => updateSymbolTransform(symbol.id, "rotation", value)}
      />
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

  const symbol = project.symbols.find((item) => item.id === selectedObjectId);
  if (symbol) return <SymbolProperties symbol={symbol} idPrefix={idPrefix} />;
  const scatter = project.scatter.find((item) => item.id === selectedObjectId);
  if (scatter) return <ScatterProperties scatter={scatter} idPrefix={idPrefix} />;

  return (
    <p className="p-4 text-sm text-muted-foreground">
      Select a stop, travel leg, or terrain layer to edit it.
    </p>
  );
}

function AddTravelObject() {
  const project = useEditorStore((state) => state.project);
  const addTravelStop = useEditorStore((state) => state.addTravelStop);
  const addTravelLeg = useEditorStore((state) => state.addTravelLeg);
  const [dialog, setDialog] = useState<"stop" | "leg" | null>(null);
  const [stopName, setStopName] = useState("New stop");
  const [dayLabel, setDayLabel] = useState("DAY 1");
  const [legName, setLegName] = useState("New travel leg");
  const [mode, setMode] = useState<TravelLeg["mode"]>("drive");
  const stops = project.kind === "travel" ? project.stops : [];
  const longitude =
    stops.reduce((sum, stop) => sum + stop.coordinates[0], 0) /
    Math.max(1, stops.length);
  const latitude =
    stops.reduce((sum, stop) => sum + stop.coordinates[1], 0) /
    Math.max(1, stops.length);
  const [from, setFrom] = useState(stops[0]?.id ?? "");
  const [to, setTo] = useState(stops[1]?.id ?? "");
  const [longitudeValue, setLongitudeValue] = useState(longitude);
  const [latitudeValue, setLatitudeValue] = useState(latitude);

  if (project.kind !== "travel") return null;

  function openSymbolLibrary() {
    window.dispatchEvent(new CustomEvent("mapper:open-symbols"));
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label="Add itinerary object">
            <Plus aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuLabel>Add to itinerary</DropdownMenuLabel>
          <DropdownMenuItem onSelect={() => {
            setLongitudeValue(longitude);
            setLatitudeValue(latitude);
            setDialog("stop");
          }}>
            <MapPin aria-hidden="true" /> Add stop
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={project.stops.length < 2}
            onSelect={() => {
              setFrom(project.stops[0]?.id ?? "");
              setTo(project.stops[1]?.id ?? "");
              setDialog("leg");
            }}
          >
            <CarFront aria-hidden="true" /> Add travel leg
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={openSymbolLibrary}>
            <MapPinned aria-hidden="true" /> Place symbol
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={openSymbolLibrary}>
            <Mountain aria-hidden="true" /> Create scatter
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={dialog !== null} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialog === "leg" ? "Add travel leg" : "Add stop"}</DialogTitle>
            <DialogDescription>
              {dialog === "leg"
                ? "Connect two itinerary stops. Styling can be refined after creation."
                : "Create a stop at geographic coordinates. You can drag it on the map later."}
            </DialogDescription>
          </DialogHeader>
          {dialog === "leg" ? (
            <form
              className="grid gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                addTravelLeg({ name: legName, from, to, mode });
                setDialog(null);
              }}
            >
              <div className="grid gap-1.5">
                <Label htmlFor="new-leg-name">Name</Label>
                <Input id="new-leg-name" value={legName} maxLength={100} onChange={(event) => setLegName(event.currentTarget.value)} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="new-leg-from">From</Label>
                  <Select value={from} onValueChange={(value) => value && setFrom(value)}>
                    <SelectTrigger id="new-leg-from"><SelectValue /></SelectTrigger>
                    <SelectContent>{project.stops.map((stop) => <SelectItem key={stop.id} value={stop.id}>{stop.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="new-leg-to">To</Label>
                  <Select value={to} onValueChange={(value) => value && setTo(value)}>
                    <SelectTrigger id="new-leg-to"><SelectValue /></SelectTrigger>
                    <SelectContent>{project.stops.map((stop) => <SelectItem key={stop.id} value={stop.id}>{stop.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="new-leg-mode">Travel mode</Label>
                <Select value={mode} onValueChange={(value) => value && setMode(value as TravelLeg["mode"])}>
                  <SelectTrigger id="new-leg-mode"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.keys(modeIcons).map((travelMode) => <SelectItem key={travelMode} value={travelMode}>{travelMode}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialog(null)}>Cancel</Button>
                <Button type="submit" disabled={!legName.trim() || !from || !to || from === to}>Add leg</Button>
              </DialogFooter>
            </form>
          ) : (
            <form
              className="grid gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                addTravelStop({
                  name: stopName,
                  dayLabel,
                  coordinates: [longitudeValue, latitudeValue],
                });
                setDialog(null);
              }}
            >
              <div className="grid gap-1.5">
                <Label htmlFor="new-stop-name">Name</Label>
                <Input id="new-stop-name" value={stopName} maxLength={80} onChange={(event) => setStopName(event.currentTarget.value)} required />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="new-stop-day">Day label</Label>
                <Input id="new-stop-day" value={dayLabel} maxLength={24} onChange={(event) => setDayLabel(event.currentTarget.value)} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="new-stop-longitude">Longitude</Label>
                  <Input id="new-stop-longitude" type="number" min={-180} max={180} step="any" value={longitudeValue} onChange={(event) => setLongitudeValue(event.currentTarget.valueAsNumber)} required />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="new-stop-latitude">Latitude</Label>
                  <Input id="new-stop-latitude" type="number" min={-90} max={90} step="any" value={latitudeValue} onChange={(event) => setLatitudeValue(event.currentTarget.valueAsNumber)} required />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialog(null)}>Cancel</Button>
                <Button type="submit" disabled={!stopName.trim() || !dayLabel.trim() || !Number.isFinite(longitudeValue) || !Number.isFinite(latitudeValue)}>Add stop</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export function ObjectPanel({
  idPrefix = "",
  showAddAction = true,
  onCollapse,
  onObjectSelected,
}: {
  idPrefix?: string;
  showAddAction?: boolean;
  onCollapse?: () => void;
  onObjectSelected?: () => void;
}) {
  const project = useEditorStore((state) => state.project);
  const selectedObjectId = useEditorStore((state) => state.selectedObjectId);
  const selectObject = useEditorStore((state) => state.selectObject);

  if (project.kind !== "travel") {
    return <TrailObjectPanel idPrefix={idPrefix} onObjectSelected={onObjectSelected} />;
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-sidebar text-sidebar-foreground">
      <div className="grid min-h-12 shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center border-b border-sidebar-border pl-3 pr-1.5">
        <div className="min-w-0 py-1.5">
          <p className="truncate text-sm font-bold">{project.name}</p>
          <p className="font-mono text-[9px] uppercase tracking-[0.13em] text-muted-foreground">
            {project.durationDays} days · travel map
          </p>
        </div>
        <div className="flex items-center gap-0.5">
          {showAddAction ? <AddTravelObject /> : null}
          {onCollapse ? (
            <Button variant="ghost" size="icon-sm" aria-label="Collapse object rail" onClick={onCollapse}>
              <PanelLeftClose aria-hidden="true" />
            </Button>
          ) : null}
        </div>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <nav aria-label="Itinerary objects">
          <CollapsibleSection id={`${idPrefix}travel-stops`} label="Stops" count={project.stops.length}>
            <ol>
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
                onSelectComplete={onObjectSelected}
              />
            ))}
            </ol>
          </CollapsibleSection>
          <CollapsibleSection id={`${idPrefix}travel-legs`} label="Travel legs" count={project.legs.length}>
            <ol>
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
                onSelectComplete={onObjectSelected}
              />
            ))}
            </ol>
          </CollapsibleSection>
          {project.symbols.length ? (
          <CollapsibleSection id={`${idPrefix}travel-symbols`} label="Symbols" count={project.symbols.length}>
            <ol>
            {project.symbols.map((symbol, index) => (
              <ObjectRow
                key={symbol.id}
                id={symbol.id}
                name={symbol.iconId}
                detail={`scale ${symbol.scale.toFixed(1)}`}
                visible={symbol.visible}
                index={index + 1}
                icon={MapPin}
                accent="water"
                onSelectComplete={onObjectSelected}
              />
            ))}
            </ol>
          </CollapsibleSection>
          ) : null}
          {project.scatter.length ? (
          <CollapsibleSection id={`${idPrefix}travel-scatter`} label="Scatter rules" count={project.scatter.length}>
            <ol>
            {project.scatter.map((scatter, index) => (
              <ObjectRow
                key={scatter.id}
                id={scatter.id}
                name={scatter.name}
                detail={`${scatter.count} · ${scatter.region.type}`}
                visible={scatter.visible}
                index={index + 1}
                icon={Mountain}
                accent="terrain"
                onSelectComplete={onObjectSelected}
              />
            ))}
            </ol>
          </CollapsibleSection>
          ) : null}
          <CollapsibleSection id={`${idPrefix}travel-context`} label="Map context" count={1}>
            <ol>
            <li
              className={cn(
                "grid grid-cols-[1.6rem_1fr_2rem] items-center border-b border-sidebar-border",
                selectedObjectId === "terrain-context" && "bg-sidebar-accent",
              )}
            >
              <span className="self-stretch border-r border-sidebar-border" />
              <button
                type="button"
                onClick={() => {
                  selectObject("terrain-context");
                  onObjectSelected?.();
                }}
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
          </CollapsibleSection>
        </nav>
        <Separator />
        <CollapsibleSection id={`${idPrefix}travel-properties`} label="Selected properties">
          <SelectedProperties idPrefix={idPrefix} />
        </CollapsibleSection>
      </ScrollArea>
    </div>
  );
}
