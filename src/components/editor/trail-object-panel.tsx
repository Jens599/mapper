"use client";

import { MapPin, Mountain, Route } from "lucide-react";

import { NoiseControl } from "@/components/editor/noise-control";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useEditorStore } from "@/store/editor-store";

export function TrailObjectPanel({ idPrefix = "" }: { idPrefix?: string }) {
  const project = useEditorStore((state) => state.project);
  const selectedObjectId = useEditorStore((state) => state.selectedObjectId);
  const selectObject = useEditorStore((state) => state.selectObject);
  const toggleObjectVisibility = useEditorStore((state) => state.toggleObjectVisibility);
  const toggleContours = useEditorStore((state) => state.toggleContours);
  const updateTrailNoise = useEditorStore((state) => state.updateTrailNoise);
  const updateSymbolTransform = useEditorStore((state) => state.updateSymbolTransform);
  const updatePresentation = useEditorStore((state) => state.updatePresentation);

  if (project.kind !== "trail") return null;
  const selectedRoute = project.routes.find((route) => route.id === selectedObjectId);
  const selectedPoint = project.waypoints.find((point) => point.id === selectedObjectId);
  const selectedIcon = project.icons.find((icon) => icon.id === selectedObjectId);
  const selectedScatter = project.scatter.find((scatter) => scatter.id === selectedObjectId);

  return (
    <div className="flex h-full min-h-0 flex-col bg-sidebar text-sidebar-foreground">
      <div className="min-h-12 border-b border-sidebar-border px-3 py-2">
        <p className="truncate text-sm font-bold">{project.name}</p>
        <p className="font-mono text-[9px] uppercase tracking-[0.13em] text-muted-foreground">
          Perlin trail sketch
        </p>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <nav aria-label="Trail objects">
          <ol>
            <li className="border-b bg-muted/35 px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">
              Waypoints
            </li>
            {project.waypoints.map((point, index) => (
              <li
                key={point.id}
                className={cn(
                  "grid grid-cols-[1.6rem_1fr_2rem] items-center border-b",
                  selectedObjectId === point.id && "bg-sidebar-accent",
                )}
              >
                <span className="text-center font-mono text-[9px] text-muted-foreground">{index + 1}</span>
                <button
                  type="button"
                  onClick={() => selectObject(point.id)}
                  className="focus-ring flex min-h-12 items-center gap-2 px-2 text-left"
                >
                  <MapPin className="size-4 text-trail" aria-hidden="true" />
                  <span>
                    <span className="block text-[13px] font-semibold">{point.name}</span>
                    <span className="font-mono text-[9px] text-muted-foreground">
                      {point.elevation ?? "--"} {project.units}
                    </span>
                  </span>
                </button>
                <Switch
                  checked={point.visible}
                  onCheckedChange={() => toggleObjectVisibility(point.id)}
                  aria-label={`${point.visible ? "Hide" : "Show"} ${point.name}`}
                  className="scale-75"
                />
              </li>
            ))}
            <li className="border-b bg-muted/35 px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">
              Routes and terrain
            </li>
            {project.routes.map((route) => (
              <li
                key={route.id}
                className={cn(
                  "grid grid-cols-[1.6rem_1fr_2rem] items-center border-b",
                  selectedObjectId === route.id && "bg-sidebar-accent",
                )}
              >
                <span />
                <button
                  type="button"
                  onClick={() => selectObject(route.id)}
                  className="focus-ring flex min-h-12 items-center gap-2 px-2 text-left"
                >
                  <Route className="size-4 text-trail" aria-hidden="true" />
                  <span className="text-[13px] font-semibold">{route.name}</span>
                </button>
                <Switch
                  checked={route.visible}
                  onCheckedChange={() => toggleObjectVisibility(route.id)}
                  aria-label={`${route.visible ? "Hide" : "Show"} ${route.name}`}
                  className="scale-75"
                />
              </li>
            ))}
            <li className="grid grid-cols-[1.6rem_1fr_2rem] items-center border-b">
              <span />
              <button
                type="button"
                onClick={() => selectObject("trail-terrain")}
                className="focus-ring flex min-h-12 items-center gap-2 px-2 text-left"
              >
                <Mountain className="size-4 text-terrain" aria-hidden="true" />
                <span className="text-[13px] font-semibold">Concept contours</span>
              </button>
              <Switch
                checked={project.terrain.visible}
                onCheckedChange={toggleContours}
                aria-label={`${project.terrain.visible ? "Hide" : "Show"} concept contours`}
                className="scale-75"
              />
            </li>
            {project.icons.map((icon) => (
              <li key={icon.id} className={cn("grid grid-cols-[1.6rem_1fr_2rem] items-center border-b", selectedObjectId === icon.id && "bg-sidebar-accent")}>
                <span />
                <button type="button" onClick={() => selectObject(icon.id)} className="focus-ring flex min-h-12 items-center gap-2 px-2 text-left">
                  <MapPin className="size-4 text-water" aria-hidden="true" />
                  <span className="truncate text-[13px] font-semibold">{icon.iconId}</span>
                </button>
                <Switch checked={icon.visible} onCheckedChange={() => toggleObjectVisibility(icon.id)} aria-label={`${icon.visible ? "Hide" : "Show"} ${icon.iconId}`} className="scale-75" />
              </li>
            ))}
            {project.scatter.map((scatter) => (
              <li key={scatter.id} className={cn("grid grid-cols-[1.6rem_1fr_2rem] items-center border-b", selectedObjectId === scatter.id && "bg-sidebar-accent")}>
                <span />
                <button type="button" onClick={() => selectObject(scatter.id)} className="focus-ring flex min-h-12 items-center gap-2 px-2 text-left">
                  <Mountain className="size-4 text-terrain" aria-hidden="true" />
                  <span className="min-w-0"><span className="block truncate text-[13px] font-semibold">{scatter.name}</span><span className="font-mono text-[9px] text-muted-foreground">{scatter.count} · {scatter.region.type}</span></span>
                </button>
                <Switch checked={scatter.visible} onCheckedChange={() => toggleObjectVisibility(scatter.id)} aria-label={`${scatter.visible ? "Hide" : "Show"} ${scatter.name}`} className="scale-75" />
              </li>
            ))}
          </ol>
        </nav>
        <Separator />
        {selectedRoute ? (
          <section aria-labelledby={`${idPrefix}trail-route-properties`} className="grid gap-5 p-4">
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-trail">Generated route</p>
              <h2 id={`${idPrefix}trail-route-properties`} className="mt-1 text-sm font-bold">{selectedRoute.name}</h2>
            </div>
            <NoiseControl
              id={`${idPrefix}trail-amplitude`}
              label="Winding amplitude"
              value={selectedRoute.noise.amplitude}
              min={0}
              max={120}
              step={1}
              unit={project.units}
              onChange={(value) => updateTrailNoise(selectedRoute.id, "amplitude", value)}
            />
            <NoiseControl
              id={`${idPrefix}trail-wavelength`}
              label="Noise scale"
              value={selectedRoute.noise.wavelength}
              min={10}
              max={300}
              step={5}
              unit={project.units}
              onChange={(value) => updateTrailNoise(selectedRoute.id, "wavelength", value)}
            />
            <NoiseControl
              id={`${idPrefix}trail-warp`}
              label="Domain warp"
              value={selectedRoute.noise.warpStrength}
              min={0}
              max={2}
              step={0.05}
              onChange={(value) => updateTrailNoise(selectedRoute.id, "warpStrength", value)}
            />
          </section>
        ) : selectedIcon ? (
          <section className="grid gap-5 p-4">
            <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-water">Placed symbol</p>
            <h2 className="text-sm font-bold">{selectedIcon.iconId}</h2>
            <NoiseControl id={`${idPrefix}trail-icon-scale`} label="Scale" value={selectedIcon.scale} min={0.1} max={5} step={0.1} onChange={(value) => updateSymbolTransform(selectedIcon.id, "scale", value)} />
            <NoiseControl id={`${idPrefix}trail-icon-rotation`} label="Rotation" value={selectedIcon.rotation} min={-180} max={180} step={1} unit="°" onChange={(value) => updateSymbolTransform(selectedIcon.id, "rotation", value)} />
          </section>
        ) : selectedScatter ? (
          <section className="grid gap-3 p-4">
            <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-terrain">Seeded scatter rule</p>
            <h2 className="text-sm font-bold">{selectedScatter.name}</h2>
            <p className="font-mono text-xs text-muted-foreground">{selectedScatter.count} symbols · seed {selectedScatter.seed}</p>
            <p className="text-xs leading-5 text-muted-foreground">Region: {selectedScatter.region.type}. Edit its complete region limits and randomizer in Builder.</p>
          </section>
        ) : selectedPoint ? (
          <section className="grid gap-3 p-4">
            <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-trail">Waypoint</p>
            <h2 className="text-sm font-bold">{selectedPoint.name}</h2>
            <p className="font-mono text-xs text-muted-foreground">
              x {selectedPoint.x.toFixed(0)} · y {selectedPoint.y.toFixed(0)}
            </p>
          </section>
        ) : null}
        <Separator />
        <section className="grid gap-4 p-4">
          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">Presentation scale</p>
          <NoiseControl id={`${idPrefix}trail-line-scale`} label="Lines" value={project.presentation.lineScale} min={0.25} max={4} step={0.05} onChange={(value) => updatePresentation("lineScale", value)} />
          <NoiseControl id={`${idPrefix}trail-text-scale`} label="Text" value={project.presentation.textScale} min={0.5} max={3} step={0.05} onChange={(value) => updatePresentation("textScale", value)} />
          <NoiseControl id={`${idPrefix}trail-symbol-scale`} label="Symbols" value={project.presentation.symbolScale} min={0.25} max={4} step={0.05} onChange={(value) => updatePresentation("symbolScale", value)} />
        </section>
      </ScrollArea>
    </div>
  );
}
