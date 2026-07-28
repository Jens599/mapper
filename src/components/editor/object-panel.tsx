"use client";

import {
  CarFront,
  ChevronDown,
  FileCode2,
  Footprints,
  MapPinned,
  MapPin,
  Mountain,
  Paintbrush,
  PanelLeftClose,
  Pencil,
  Plane,
  Plus,
  Search,
  Ship,
  TrainFront,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

import { NoiseControl } from "@/components/editor/noise-control";
import { IconPicker } from "@/components/editor/icon-picker";
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
import { boundaryFromGeoJson, fetchOsmBoundary } from "@/lib/boundary-utils";
import type { BoundaryAsset, TravelLeg, TravelScatter, TravelStop } from "@/lib/project-schema";
import { cn } from "@/lib/utils";
import { useEditorStore } from "@/store/editor-store";

const modeIcons = {
  walk: Footprints,
  drive: CarFront,
  flight: Plane,
  train: TrainFront,
  boat: Ship,
} as const;

const symbolicPresentationOptions = [
  ["Line background", "showLineHalo"],
  ["Legend", "showLegend"],
  ["Title/subtitle", "showTitleBlock"],
  ["Nepal silhouette", "showMapSilhouette"],
  ["Label leader lines", "showLeaderLines"],
  ["Start/finish emphasis", "emphasizeEndpoints"],
  ["Sequential day labels", "sequentialDayLabels"],
  ["Extra arrowheads", "extraArrowheads"],
  ["Stronger route colors", "vividTransportColors"],
  ["Fill canvas", "fillCanvas"],
  ["Larger day text", "largerDayText"],
] as const;

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
  const deleteSelectedObjects = useEditorStore((state) => state.deleteSelectedObjects);
  const selected = selectedObjectId === id;

  return (
    <li
      className={cn(
        "m-2 grid grid-cols-[2rem_1fr_auto] items-center rounded-xl border border-sidebar-border/70 bg-sidebar-accent/20 shadow-sm transition-colors hover:bg-sidebar-accent/45",
        selected && "border-trail/60 bg-sidebar-accent shadow-[inset_3px_0_0_var(--trail)]",
      )}
    >
      <span
        className="flex size-full min-h-12 items-center justify-center border-r border-sidebar-border/70 font-mono text-[9px] text-muted-foreground"
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
        className="focus-ring flex min-h-12 min-w-0 items-center gap-2 px-2.5 text-left"
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
      <div className="flex items-center gap-1 pr-1.5">
        <Switch
          checked={visible}
          onCheckedChange={() => toggleObjectVisibility(id)}
          aria-label={`${visible ? "Hide" : "Show"} ${name}`}
          className="scale-75"
        />
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Delete ${name}`}
          onClick={() => {
            const store = useEditorStore.getState();
            store.cancelFormatPainter();
            store.selectObject(id);
            deleteSelectedObjects();
          }}
        >
          <Trash2 aria-hidden="true" />
        </Button>
      </div>
    </li>
  );
}

function EditStopDialog({ stop }: { stop: TravelStop }) {
  const updateTravelStop = useEditorStore((state) => state.updateTravelStop);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(stop.name);
  const [dayLabel, setDayLabel] = useState(stop.dayLabel);
  const [longitude, setLongitude] = useState(stop.coordinates[0]);
  const [latitude, setLatitude] = useState(stop.coordinates[1]);
  const [elevation, setElevation] = useState(stop.elevation === undefined ? "" : String(stop.elevation));

  function openEditor() {
    setName(stop.name);
    setDayLabel(stop.dayLabel);
    setLongitude(stop.coordinates[0]);
    setLatitude(stop.coordinates[1]);
    setElevation(stop.elevation === undefined ? "" : String(stop.elevation));
    setOpen(true);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="outline" size="sm" onClick={openEditor}><Pencil aria-hidden="true" /> Edit stop</Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit stop</DialogTitle>
          <DialogDescription>Update the point label and geographic details.</DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={(event) => {
          event.preventDefault();
          updateTravelStop(stop.id, {
            name,
            dayLabel,
            coordinates: [longitude, latitude],
            elevation: elevation.trim() === "" ? undefined : Number(elevation),
          });
          setOpen(false);
        }}>
          <div className="grid gap-1.5"><Label htmlFor="edit-stop-name">Name</Label><Input id="edit-stop-name" value={name} maxLength={80} onChange={(event) => setName(event.currentTarget.value)} required /></div>
          <div className="grid gap-1.5"><Label htmlFor="edit-stop-day">Day label</Label><Input id="edit-stop-day" value={dayLabel} maxLength={24} onChange={(event) => setDayLabel(event.currentTarget.value)} required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5"><Label htmlFor="edit-stop-longitude">Longitude</Label><Input id="edit-stop-longitude" type="number" min={-180} max={180} step="any" value={longitude} onChange={(event) => setLongitude(event.currentTarget.valueAsNumber)} required /></div>
            <div className="grid gap-1.5"><Label htmlFor="edit-stop-latitude">Latitude</Label><Input id="edit-stop-latitude" type="number" min={-90} max={90} step="any" value={latitude} onChange={(event) => setLatitude(event.currentTarget.valueAsNumber)} required /></div>
          </div>
          <div className="grid gap-1.5"><Label htmlFor="edit-stop-elevation">Elevation (optional)</Label><Input id="edit-stop-elevation" type="number" step="any" value={elevation} onChange={(event) => setElevation(event.currentTarget.value)} /></div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={!name.trim() || !dayLabel.trim() || !Number.isFinite(longitude) || !Number.isFinite(latitude) || (elevation.trim() !== "" && !Number.isFinite(Number(elevation)))}>Save stop</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditLegDialog({ leg, stops }: { leg: TravelLeg; stops: TravelStop[] }) {
  const updateTravelLeg = useEditorStore((state) => state.updateTravelLeg);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(leg.name);
  const [from, setFrom] = useState(leg.from);
  const [to, setTo] = useState(leg.to);
  const [mode, setMode] = useState<TravelLeg["mode"]>(leg.mode);
  const [loopback, setLoopback] = useState(leg.loopback);

  function openEditor() {
    setName(leg.name);
    setFrom(leg.from);
    setTo(leg.to);
    setMode(leg.mode);
    setLoopback(leg.loopback);
    setOpen(true);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="outline" size="sm" onClick={openEditor}><Pencil aria-hidden="true" /> Edit leg</Button>
      <DialogContent>
        <DialogHeader><DialogTitle>Edit travel leg</DialogTitle><DialogDescription>Change endpoints, travel mode, or loopback behavior.</DialogDescription></DialogHeader>
        <form className="grid gap-4" onSubmit={(event) => {
          event.preventDefault();
          updateTravelLeg(leg.id, { name, from, to, mode, loopback });
          setOpen(false);
        }}>
          <div className="grid gap-1.5"><Label htmlFor="edit-leg-name">Name</Label><Input id="edit-leg-name" value={name} maxLength={100} onChange={(event) => setName(event.currentTarget.value)} required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5"><Label htmlFor="edit-leg-from">From</Label><Select value={from} onValueChange={(value) => value && setFrom(value)}><SelectTrigger id="edit-leg-from" className="w-full"><SelectValue /></SelectTrigger><SelectContent>{stops.map((stop) => <SelectItem key={stop.id} value={stop.id}>{stop.name}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid gap-1.5"><Label htmlFor="edit-leg-to">To</Label><Select value={to} onValueChange={(value) => value && setTo(value)}><SelectTrigger id="edit-leg-to" className="w-full"><SelectValue /></SelectTrigger><SelectContent>{stops.map((stop) => <SelectItem key={stop.id} value={stop.id}>{stop.name}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <div className="grid gap-1.5"><Label htmlFor="edit-leg-mode">Travel mode</Label><Select value={mode} onValueChange={(value) => value && setMode(value as TravelLeg["mode"])}><SelectTrigger id="edit-leg-mode" className="w-full"><SelectValue /></SelectTrigger><SelectContent>{Object.keys(modeIcons).map((travelMode) => <SelectItem key={travelMode} value={travelMode}>{travelMode}</SelectItem>)}</SelectContent></Select></div>
          <label className="flex min-h-9 items-center justify-between gap-3 text-sm">Loopback<Switch checked={loopback} onCheckedChange={(checked) => { setLoopback(checked); if (checked && from) setTo(from); }} /></label>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={!name.trim() || !from || !to || (from === to && !loopback)}>Save leg</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
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
  const updateStopLabelStyle = useEditorStore(
    (state) => state.updateStopLabelStyle,
  );
  const updatePointIcon = useEditorStore((state) => state.updatePointIcon);
  const updateTravelStop = useEditorStore((state) => state.updateTravelStop);
  const project = useEditorStore((state) => state.project);
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
      <EditStopDialog stop={stop} />
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
      <div className="grid gap-1.5">
        <Label htmlFor={`${idPrefix}stop-symbol`}>Point symbol</Label>
        <IconPicker
          value={stop.icon}
          onValueChange={(value) => value && updatePointIcon(stop.id, value)}
          customIcons={project.kind === "travel" ? project.iconAssets : []}
          label="Point symbol"
        />
      </div>
      <p className="border-l-2 border-water pl-3 text-xs leading-5 text-muted-foreground">
        Point style
      </p>
      <label className="flex min-h-8 items-center justify-between gap-3 text-sm">
        Background fill
        <Switch checked={stop.pointStyle.showFill} onCheckedChange={(checked) => updateTravelStop(stop.id, { pointStyle: { ...stop.pointStyle, showFill: checked } })} />
      </label>
      {stop.pointStyle.showFill ? (
      <div className="grid gap-1.5">
        <Label htmlFor={`${idPrefix}point-fill`}>Fill color</Label>
        <div className="flex items-center gap-2">
          <input
            id={`${idPrefix}point-fill`}
            type="color"
            value={stop.pointStyle.fill}
            onChange={(event) => updateTravelStop(stop.id, { pointStyle: { ...stop.pointStyle, fill: event.currentTarget.value } })}
            className="size-8 cursor-pointer rounded border bg-transparent p-0.5"
          />
          <span className="font-mono text-xs text-muted-foreground">{stop.pointStyle.fill}</span>
        </div>
      </div>
      ) : null}
      <label className="flex min-h-8 items-center justify-between gap-3 text-sm">
        Border stroke
        <Switch checked={stop.pointStyle.showStroke} onCheckedChange={(checked) => updateTravelStop(stop.id, { pointStyle: { ...stop.pointStyle, showStroke: checked } })} />
      </label>
      {stop.pointStyle.showStroke ? (
      <div className="grid gap-1.5">
        <Label htmlFor={`${idPrefix}point-stroke`}>Stroke color</Label>
        <div className="flex items-center gap-2">
          <input
            id={`${idPrefix}point-stroke`}
            type="color"
            value={stop.pointStyle.stroke}
            onChange={(event) => updateTravelStop(stop.id, { pointStyle: { ...stop.pointStyle, stroke: event.currentTarget.value } })}
            className="size-8 cursor-pointer rounded border bg-transparent p-0.5"
          />
          <span className="font-mono text-xs text-muted-foreground">{stop.pointStyle.stroke}</span>
        </div>
      </div>
      ) : null}
      <div className="grid gap-1.5">
        <Label htmlFor={`${idPrefix}label-anchor`}>Tag alignment</Label>
        <Select value={stop.labelAnchor} onValueChange={(value) => value && updateTravelStop(stop.id, { labelAnchor: value as TravelStop["labelAnchor"] })}>
          <SelectTrigger id={`${idPrefix}label-anchor`} className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="auto">Automatic</SelectItem>
            <SelectItem value="top">Above</SelectItem>
            <SelectItem value="right">Right</SelectItem>
            <SelectItem value="bottom">Below</SelectItem>
            <SelectItem value="left">Left</SelectItem>
          </SelectContent>
        </Select>
      </div>
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
      <p className="border-t border-sidebar-border pt-4 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
        Label style
      </p>
      <NoiseControl
        id={`${idPrefix}label-font-size`}
        label="Font size"
        value={stop.labelStyle.fontSize}
        min={0.5}
        max={3}
        step={0.1}
        onChange={(value) => updateStopLabelStyle(stop.id, "fontSize", value)}
      />
      <div className="grid gap-1.5">
        <Label htmlFor={`${idPrefix}label-color`}>Text color</Label>
        <div className="flex items-center gap-2">
          <input
            id={`${idPrefix}label-color`}
            type="color"
            value={stop.labelStyle.color}
            onChange={(event) => updateStopLabelStyle(stop.id, "color", event.currentTarget.value)}
            className="size-8 cursor-pointer rounded border bg-transparent p-0.5"
          />
          <span className="font-mono text-xs text-muted-foreground">{stop.labelStyle.color}</span>
        </div>
      </div>
      <label className="flex min-h-8 items-center justify-between gap-3 text-sm">
        Bold text
        <Switch checked={stop.labelStyle.bold} onCheckedChange={(checked) => updateStopLabelStyle(stop.id, "bold", checked)} />
      </label>
    </section>
  );
}

function LegProperties({
  leg,
  idPrefix,
  stops,
}: {
  leg: TravelLeg;
  idPrefix: string;
  stops: TravelStop[];
}) {
  const updateLegStyle = useEditorStore((state) => state.updateLegStyle);
  const applyLegShapeToAll = useEditorStore((state) => state.applyLegShapeToAll);
  const updateTravelLeg = useEditorStore((state) => state.updateTravelLeg);
  const updateLegIcon = useEditorStore((state) => state.updateLegIcon);
  const project = useEditorStore((state) => state.project);
  const stopNames = new Map(stops.map((stop) => [stop.id, stop.name]));
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
      <EditLegDialog leg={leg} stops={stops} />
      <div className="grid gap-1.5">
        <Label htmlFor={`${idPrefix}leg-icon`}>Symbol (replaces transport label)</Label>
        <IconPicker
          value={leg.iconId ?? null}
          onValueChange={(value) => updateLegIcon(leg.id, value || undefined)}
          customIcons={project.kind === "travel" ? project.iconAssets : []}
          label="Leg symbol"
          allowNone
        />
      </div>
      <label className="flex min-h-9 items-center justify-between gap-3 text-sm">
        Show destination day on arrow
        <Switch checked={leg.showDayLabel} onCheckedChange={(checked) => updateTravelLeg(leg.id, { showDayLabel: checked })} />
      </label>
      <NoiseControl
        id={`${idPrefix}curvature`}
        label="Route curve"
        value={leg.style.curvature}
        min={-10}
        max={10}
        step={0.02}
        onChange={(value) => updateLegStyle(leg.id, "curvature", value)}
      />
      <div className="grid gap-1.5">
        <Label htmlFor={`${idPrefix}line-style`}>Line style</Label>
        <Select value={leg.style.line} onValueChange={(value) => value && updateLegStyle(leg.id, "line", value as TravelLeg["style"]["line"])}>
          <SelectTrigger id={`${idPrefix}line-style`} className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="solid">Solid</SelectItem>
            <SelectItem value="dashed">Dashed</SelectItem>
            <SelectItem value="dotted">Dotted</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <NoiseControl id={`${idPrefix}noise-amplitude`} label="Perlin amplitude" value={leg.style.noiseAmplitude} min={-10} max={10} step={0.01} onChange={(value) => updateLegStyle(leg.id, "noiseAmplitude", value)} />
      <NoiseControl id={`${idPrefix}noise-seed`} label="Noise seed" value={leg.style.noiseSeed} min={0} max={2_147_483_647} step={1} onChange={(value) => updateLegStyle(leg.id, "noiseSeed", Math.round(value))} />
      <NoiseControl id={`${idPrefix}noise-scale`} label="Noise scale" value={leg.style.noiseScale} min={0.25} max={8} step={0.25} onChange={(value) => updateLegStyle(leg.id, "noiseScale", value)} />
      <NoiseControl id={`${idPrefix}noise-octaves`} label="Noise octaves" value={leg.style.noiseOctaves} min={1} max={6} step={1} onChange={(value) => updateLegStyle(leg.id, "noiseOctaves", Math.round(value))} />
      <NoiseControl id={`${idPrefix}noise-modulation`} label="Noise modulation" value={leg.style.noiseModulation} min={-10} max={10} step={0.01} onChange={(value) => updateLegStyle(leg.id, "noiseModulation", value)} />
      <Button variant="outline" size="sm" onClick={() => applyLegShapeToAll(leg.id)}>Apply route shape to all legs</Button>
      <NoiseControl
        id={`${idPrefix}winding`}
        label="Hand-drawn winding"
        value={leg.style.winding}
        min={-10}
        max={10}
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
  const setMapStyle = useEditorStore((state) => state.setMapStyle);
  const setMapBackground = useEditorStore((state) => state.setMapBackground);
  const updatePresentation = useEditorStore((state) => state.updatePresentation);
  const resetPresentation = useEditorStore((state) => state.resetPresentation);
  const addBoundaryAsset = useEditorStore((state) => state.addBoundaryAsset);
  const presentation = useEditorStore((state) => state.project.presentation);
  const [boundaryQuery, setBoundaryQuery] = useState("Nepal");
  const [boundaryStatus, setBoundaryStatus] = useState<string | null>(null);
  const [boundaryBusy, setBoundaryBusy] = useState(false);
  const lineScale = Number.isFinite(presentation.lineScale) ? presentation.lineScale : 1;
  const textScale = Number.isFinite(presentation.textScale) ? presentation.textScale : 1;
  const symbolScale = Number.isFinite(presentation.symbolScale) ? presentation.symbolScale : 1;

  if (!mapSettings) return null;

  async function importOsmBoundary() {
    setBoundaryBusy(true);
    setBoundaryStatus(null);
    try {
      addBoundaryAsset(await fetchOsmBoundary(boundaryQuery));
      setBoundaryStatus("Boundary imported from OpenStreetMap.");
    } catch (reason) {
      setBoundaryStatus(reason instanceof Error ? reason.message : "Boundary import failed.");
    } finally {
      setBoundaryBusy(false);
    }
  }

  async function importBoundaryFile(file: File | undefined) {
    if (!file) return;
    setBoundaryStatus(null);
    try {
      addBoundaryAsset(boundaryFromGeoJson(JSON.parse(await file.text()), file.name.replace(/\.geojson|\.json$/i, "")));
      setBoundaryStatus("Boundary imported from GeoJSON.");
    } catch (reason) {
      setBoundaryStatus(reason instanceof Error ? reason.message : "GeoJSON import failed.");
    }
  }

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
          No map
        </Button>
      </div>
      {mapSettings.display === "symbolic" ? (
        <>
          <div className="grid gap-1.5">
            <Label>Background</Label>
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { label: "Canvas", value: "#e9efeb" },
                { label: "Paper", value: "#f5f0e8" },
                { label: "Slate", value: "#d6dce4" },
                { label: "Sand", value: "#ede0c8" },
                { label: "Moss", value: "#dce3d4" },
                { label: "Dusk", value: "#c8d0d8" },
              ].map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  title={preset.label}
                  className="size-7 cursor-pointer rounded-full border border-border/60"
                  style={{ backgroundColor: preset.value }}
                  onClick={() => setMapBackground(preset.value)}
                  aria-label={preset.label}
                />
              ))}
              <input
                type="color"
                value={mapSettings.background}
                onChange={(e) => setMapBackground(e.target.value)}
                className="size-7 cursor-pointer rounded-full border-0 p-0"
                title="Custom color"
                aria-label="Custom background color"
              />
            </div>
          </div>
          <label className="flex min-h-8 items-center justify-between gap-3 text-sm">
            Transport icons
            <Switch
              checked={presentation.showModeIcons}
              onCheckedChange={(checked) => updatePresentation("showModeIcons", checked)}
            />
          </label>
          {symbolicPresentationOptions.map(([label, key]) => (
            <label key={key} className="flex min-h-8 items-center justify-between gap-3 text-sm">
              {label}
              <Switch
                checked={Boolean(presentation[key])}
                onCheckedChange={(checked) => updatePresentation(key, checked)}
              />
            </label>
          ))}
        </>
      ) : null}
      <div className="grid gap-1.5">
        <Label htmlFor={`${idPrefix}basemap-style`}>OpenStreetMap style</Label>
        <Select
          value={mapSettings.style}
          onValueChange={(value) => value && setMapStyle(value as typeof mapSettings.style)}
          disabled={mapSettings.display === "symbolic"}
        >
          <SelectTrigger id={`${idPrefix}basemap-style`} className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="positron">Positron - quiet light</SelectItem>
            <SelectItem value="liberty">Liberty - colorful terrain</SelectItem>
            <SelectItem value="bright">Bright - detailed roads</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-[11px] leading-4 text-muted-foreground">OpenFreeMap rendering of OpenStreetMap data.</p>
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
      {mapSettings.display === "symbolic" ? (
        <div className="grid gap-3 border-t pt-4">
          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
            Boundary assets
          </p>
          <div className="grid gap-2">
            <Label htmlFor={`${idPrefix}boundary-search`}>OpenStreetMap place</Label>
            <div className="flex gap-2">
              <Input id={`${idPrefix}boundary-search`} value={boundaryQuery} onChange={(event) => setBoundaryQuery(event.currentTarget.value)} placeholder="Nepal, Gandaki Province..." />
              <Button type="button" variant="outline" size="icon" disabled={boundaryBusy || !boundaryQuery.trim()} onClick={() => void importOsmBoundary()} aria-label="Import OSM boundary">
                <Search aria-hidden="true" />
              </Button>
            </div>
          </div>
          <label className="focus-ring flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border bg-card px-3 text-sm font-medium hover:bg-muted">
            <Upload aria-hidden="true" className="size-4" /> Upload GeoJSON boundary
            <input type="file" accept=".geojson,.json,application/geo+json,application/json" className="sr-only" onChange={(event) => void importBoundaryFile(event.currentTarget.files?.[0])} />
          </label>
          {boundaryStatus ? <p className="text-xs leading-5 text-muted-foreground">{boundaryStatus}</p> : null}
        </div>
      ) : null}
      <div className="grid gap-4 border-t pt-4">
        <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
          Presentation scale
        </p>
        <Button variant="outline" size="sm" onClick={resetPresentation}>Reset scales</Button>
        <NoiseControl id={`${idPrefix}line-scale`} label="Lines" value={lineScale} min={0.25} max={4} step={0.05} onChange={(value) => updatePresentation("lineScale", value)} />
        <NoiseControl id={`${idPrefix}text-scale`} label="Text" value={textScale} min={0.5} max={3} step={0.05} onChange={(value) => updatePresentation("textScale", value)} />
        <NoiseControl id={`${idPrefix}symbol-global-scale`} label="Symbols" value={symbolScale} min={0.25} max={4} step={0.05} onChange={(value) => updatePresentation("symbolScale", value)} />
      </div>
    </section>
  );
}

function ProjectTitleProperties({ idPrefix }: { idPrefix: string }) {
  const project = useEditorStore((state) => state.project);
  const updateProjectMeta = useEditorStore((state) => state.updateProjectMeta);

  if (project.kind !== "travel") return null;

  return (
    <section aria-labelledby={`${idPrefix}title-properties`} className="grid gap-4 p-4">
      <div>
        <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-water">
          Standalone heading
        </p>
        <h2 id={`${idPrefix}title-properties`} className="mt-1 text-sm font-bold">
          Title block
        </h2>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`${idPrefix}project-title`}>Title</Label>
        <Input id={`${idPrefix}project-title`} value={project.name} maxLength={120} onChange={(event) => updateProjectMeta({ name: event.currentTarget.value })} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`${idPrefix}project-subtitle`}>Subtitle</Label>
        <Input id={`${idPrefix}project-subtitle`} value={project.subtitle} maxLength={160} onChange={(event) => updateProjectMeta({ subtitle: event.currentTarget.value })} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`${idPrefix}project-days`}>Duration days</Label>
        <Input id={`${idPrefix}project-days`} type="number" min={1} max={9999} step={1} value={project.durationDays} onChange={(event) => updateProjectMeta({ durationDays: event.currentTarget.valueAsNumber })} />
      </div>
      <p className="border-l-2 border-water pl-3 text-xs leading-5 text-muted-foreground">
        Select the title directly on the canvas or use the Canvas row in the sidebar.
      </p>
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

function BoundaryProperties({ boundary, idPrefix }: { boundary: BoundaryAsset; idPrefix: string }) {
  const updateBoundaryAsset = useEditorStore((state) => state.updateBoundaryAsset);
  return (
    <section aria-labelledby={`${idPrefix}boundary-properties`} className="grid gap-4 p-4">
      <div>
        <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-terrain">Boundary asset</p>
        <h2 id={`${idPrefix}boundary-properties`} className="mt-1 text-sm font-bold">{boundary.name}</h2>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`${idPrefix}boundary-name`}>Name</Label>
        <Input id={`${idPrefix}boundary-name`} value={boundary.name} maxLength={100} onChange={(event) => updateBoundaryAsset(boundary.id, { name: event.currentTarget.value })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor={`${idPrefix}boundary-fill`}>Fill</Label>
          <input id={`${idPrefix}boundary-fill`} type="color" value={boundary.fill} onChange={(event) => updateBoundaryAsset(boundary.id, { fill: event.currentTarget.value })} className="h-8 w-full cursor-pointer rounded border bg-transparent p-0.5" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`${idPrefix}boundary-stroke`}>Stroke</Label>
          <input id={`${idPrefix}boundary-stroke`} type="color" value={boundary.stroke} onChange={(event) => updateBoundaryAsset(boundary.id, { stroke: event.currentTarget.value })} className="h-8 w-full cursor-pointer rounded border bg-transparent p-0.5" />
        </div>
      </div>
      <NoiseControl id={`${idPrefix}boundary-opacity`} label="Opacity" value={boundary.opacity} min={0} max={1} step={0.01} onChange={(value) => updateBoundaryAsset(boundary.id, { opacity: value })} />
      <p className="border-l-2 border-terrain pl-3 text-xs leading-5 text-muted-foreground">
        {boundary.attribution}. Source: {boundary.source || "project asset"}.
      </p>
    </section>
  );
}

function FormatPainterControls() {
  const project = useEditorStore((state) => state.project);
  const selectedObjectId = useEditorStore((state) => state.selectedObjectId);
  const formatClipboard = useEditorStore((state) => state.formatClipboard);
  const formatPainterActive = useEditorStore((state) => state.formatPainterActive);
  const copySelectedFormat = useEditorStore((state) => state.copySelectedFormat);
  const cancelFormatPainter = useEditorStore((state) => state.cancelFormatPainter);

  if (project.kind !== "travel") return null;

  const canCopy = Boolean(
    selectedObjectId &&
      (project.stops.some((item) => item.id === selectedObjectId) ||
        project.legs.some((item) => item.id === selectedObjectId) ||
        project.symbols.some((item) => item.id === selectedObjectId) ||
        project.scatter.some((item) => item.id === selectedObjectId)),
  );
  const copiedLabel = formatClipboard
    ? formatClipboard.kind.replace("travel-", "")
    : "nothing";

  return (
    <div className="grid gap-2 border-b border-sidebar-border bg-sidebar-accent/20 p-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
            Format painter
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {formatPainterActive ? `Click a ${copiedLabel} to apply.` : "Copy styling, then click a matching target."}
          </p>
        </div>
        {formatPainterActive ? (
          <Button variant="ghost" size="icon-sm" aria-label="Cancel format painter" onClick={cancelFormatPainter}>
            <X aria-hidden="true" />
          </Button>
        ) : null}
      </div>
      <Button variant={formatPainterActive ? "default" : "outline"} size="sm" disabled={!canCopy} onClick={copySelectedFormat}>
        <Paintbrush aria-hidden="true" /> Copy format
      </Button>
    </div>
  );
}

function SelectedProperties({ idPrefix }: { idPrefix: string }) {
  const project = useEditorStore((state) => state.project);
  const selectedObjectId = useEditorStore((state) => state.selectedObjectId);
  if (project.kind !== "travel") return null;

  if (selectedObjectId === "terrain-context") {
    return <><FormatPainterControls /><TerrainProperties idPrefix={idPrefix} /></>;
  }

  if (selectedObjectId === "project-title") {
    return <><FormatPainterControls /><ProjectTitleProperties idPrefix={idPrefix} /></>;
  }

  const stop = project.stops.find((item) => item.id === selectedObjectId);
  if (stop) return <><FormatPainterControls /><StopProperties stop={stop} idPrefix={idPrefix} /></>;

  const leg = project.legs.find((item) => item.id === selectedObjectId);
  if (leg) {
    return (
      <>
        <FormatPainterControls />
        <LegProperties
          leg={leg}
          idPrefix={idPrefix}
          stops={project.stops}
        />
      </>
    );
  }

  const symbol = project.symbols.find((item) => item.id === selectedObjectId);
  if (symbol) return <><FormatPainterControls /><SymbolProperties symbol={symbol} idPrefix={idPrefix} /></>;
  const scatter = project.scatter.find((item) => item.id === selectedObjectId);
  if (scatter) return <><FormatPainterControls /><ScatterProperties scatter={scatter} idPrefix={idPrefix} /></>;
  const boundary = project.boundaries.find((item) => item.id === selectedObjectId);
  if (boundary) return <><FormatPainterControls /><BoundaryProperties boundary={boundary} idPrefix={idPrefix} /></>;

  return (
    <>
      <FormatPainterControls />
      <p className="p-4 text-sm text-muted-foreground">
        Select a stop, travel leg, or terrain layer to edit it.
      </p>
    </>
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
  const [loopback, setLoopback] = useState(false);
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
              setLoopback(false);
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
                addTravelLeg({ name: legName, from, to, mode, loopback });
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
              <label className="flex min-h-9 items-center justify-between gap-3 text-sm">
                Loop back to one stop
                <Switch
                  checked={loopback}
                  onCheckedChange={(checked) => {
                    setLoopback(checked);
                    if (checked && from) setTo(from);
                  }}
                />
              </label>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialog(null)}>Cancel</Button>
                <Button type="submit" disabled={!legName.trim() || !from || !to || (from === to && !loopback)}>Add leg</Button>
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
          <CollapsibleSection id={`${idPrefix}travel-canvas`} label="Canvas" count={2}>
            <ol>
              <li
                className={cn(
                  "m-2 grid grid-cols-[2rem_1fr_auto] items-center rounded-xl border border-sidebar-border/70 bg-sidebar-accent/20 shadow-sm transition-colors hover:bg-sidebar-accent/45",
                  selectedObjectId === "project-title" && "border-water/60 bg-sidebar-accent shadow-[inset_3px_0_0_var(--water)]",
                )}
              >
                <span className="flex size-full min-h-12 items-center justify-center border-r border-sidebar-border/70 font-mono text-[9px] text-muted-foreground">A</span>
                <button
                  type="button"
                  onClick={() => {
                    selectObject("project-title");
                    onObjectSelected?.();
                  }}
                  aria-current={selectedObjectId === "project-title" ? "true" : undefined}
                  className="focus-ring flex min-h-12 min-w-0 items-center gap-2 px-2.5 text-left"
                >
                  <FileCode2 className="size-4 shrink-0 text-water" aria-hidden="true" />
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-semibold">Title block</span>
                    <span className="block truncate font-mono text-[9px] uppercase tracking-[0.08em] text-muted-foreground">
                      {project.name}
                    </span>
                  </span>
                </button>
                <Switch
                  checked={project.presentation.showTitleBlock}
                  onCheckedChange={(checked) => useEditorStore.getState().updatePresentation("showTitleBlock", checked)}
                  aria-label={`${project.presentation.showTitleBlock ? "Hide" : "Show"} title block`}
                  className="mr-2 scale-75"
                />
              </li>
              <li
                className={cn(
                  "m-2 grid grid-cols-[2rem_1fr_auto] items-center rounded-xl border border-sidebar-border/70 bg-sidebar-accent/20 shadow-sm transition-colors hover:bg-sidebar-accent/45",
                  selectedObjectId === "terrain-context" && "border-terrain/60 bg-sidebar-accent shadow-[inset_3px_0_0_var(--terrain)]",
                )}
              >
                <span className="flex size-full min-h-12 items-center justify-center border-r border-sidebar-border/70 font-mono text-[9px] text-muted-foreground">M</span>
                <button
                  type="button"
                  onClick={() => {
                    selectObject("terrain-context");
                    onObjectSelected?.();
                  }}
                  aria-current={selectedObjectId === "terrain-context" ? "true" : undefined}
                  className="focus-ring flex min-h-12 min-w-0 items-center gap-2 px-2.5 text-left"
                >
                  <Mountain className="size-4 shrink-0 text-terrain" aria-hidden="true" />
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-semibold">Terrain</span>
                    <span className="block truncate font-mono text-[9px] uppercase tracking-[0.08em] text-muted-foreground">DEM contours</span>
                  </span>
                </button>
                <Switch
                  checked={project.map.showContours}
                  onCheckedChange={() => useEditorStore.getState().toggleContours()}
                  aria-label={`${project.map.showContours ? "Hide" : "Show"} contours`}
                  className="mr-2 scale-75"
                />
              </li>
            </ol>
          </CollapsibleSection>
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
          {project.boundaries.length ? (
          <CollapsibleSection id={`${idPrefix}travel-boundaries`} label="Boundaries" count={project.boundaries.length}>
            <ol>
            {project.boundaries.map((boundary, index) => (
              <ObjectRow
                key={boundary.id}
                id={boundary.id}
                name={boundary.name}
                detail={boundary.source || "boundary asset"}
                visible={boundary.visible}
                index={index + 1}
                icon={MapPinned}
                accent="terrain"
                onSelectComplete={onObjectSelected}
              />
            ))}
            </ol>
          </CollapsibleSection>
          ) : null}
        </nav>
        <Separator />
        <CollapsibleSection id={`${idPrefix}travel-properties`} label="Selected properties">
          <SelectedProperties idPrefix={idPrefix} />
        </CollapsibleSection>
      </ScrollArea>
    </div>
  );
}
