"use client";

import {
  Layers3,
  MapPin,
  Mountain,
  Plus,
  Route,
  Trees,
} from "lucide-react";

import { NoiseControl } from "@/components/editor/noise-control";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import type { MapperLayer } from "@/lib/project-schema";
import { cn } from "@/lib/utils";
import { useEditorStore } from "@/store/editor-store";

const layerIcons = {
  waypoints: MapPin,
  route: Route,
  contours: Mountain,
  scatter: Trees,
  icon: Layers3,
} as const;

function LayerRow({ layer, index }: { layer: MapperLayer; index: number }) {
  const selectedLayerId = useEditorStore((state) => state.selectedLayerId);
  const selectLayer = useEditorStore((state) => state.selectLayer);
  const toggleLayerVisibility = useEditorStore(
    (state) => state.toggleLayerVisibility,
  );
  const Icon = layerIcons[layer.type];
  const selected = layer.id === selectedLayerId;

  return (
    <li
      className={cn(
        "group grid grid-cols-[1.6rem_1fr_2rem] items-center border-b border-sidebar-border",
        selected && "bg-sidebar-accent",
      )}
    >
      <span
        className="self-stretch border-r border-sidebar-border pt-3 text-center font-mono text-[10px] text-muted-foreground"
        aria-hidden="true"
      >
        {index + 1}
      </span>
      <button
        type="button"
        onClick={() => selectLayer(layer.id)}
        aria-current={selected ? "true" : undefined}
        className="focus-ring flex min-h-12 min-w-0 items-center gap-2 px-2 text-left"
      >
        <Icon
          className={cn(
            "size-4 shrink-0 text-muted-foreground",
            layer.type === "route" && "text-trail",
            layer.type === "contours" && "text-terrain",
          )}
          strokeWidth={1.8}
          aria-hidden="true"
        />
        <span className="min-w-0">
          <span className="block truncate text-[13px] font-semibold">
            {layer.name}
          </span>
          <span className="block truncate font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
            {layer.type}
          </span>
        </span>
      </button>
      <Switch
        checked={layer.visible}
        onCheckedChange={() => toggleLayerVisibility(layer.id)}
        aria-label={`${layer.visible ? "Hide" : "Show"} ${layer.name}`}
        className="scale-75"
      />
    </li>
  );
}

function SelectedProperties({ idPrefix }: { idPrefix: string }) {
  const selectedLayerId = useEditorStore((state) => state.selectedLayerId);
  const layer = useEditorStore((state) =>
    state.project.layers.find((item) => item.id === selectedLayerId),
  );
  const updateRouteNoise = useEditorStore((state) => state.updateRouteNoise);

  if (!layer) {
    return (
      <p className="p-4 text-sm text-muted-foreground">
        Select an object to edit its properties.
      </p>
    );
  }

  if (layer.type !== "route") {
    return (
      <div className="grid gap-2 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {layer.name}
        </p>
        <p className="text-sm leading-5 text-muted-foreground">
          Detailed {layer.type} controls arrive with its generation tool.
        </p>
      </div>
    );
  }

  return (
    <section
      aria-labelledby={`${idPrefix}route-properties`}
      className="grid gap-5 p-4"
    >
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-trail">
          Generated route
        </p>
        <h2
          id={`${idPrefix}route-properties`}
          className="mt-1 text-sm font-bold"
        >
          {layer.name}
        </h2>
      </div>
      <NoiseControl
        id={`${idPrefix}amplitude`}
        label="Winding"
        value={layer.noise.amplitude}
        min={0}
        max={100}
        step={1}
        unit="m"
        onChange={(value) =>
          updateRouteNoise(layer.id, "amplitude", value)
        }
      />
      <NoiseControl
        id={`${idPrefix}wavelength`}
        label="Noise scale"
        value={layer.noise.wavelength}
        min={10}
        max={300}
        step={5}
        unit="m"
        onChange={(value) =>
          updateRouteNoise(layer.id, "wavelength", value)
        }
      />
      <NoiseControl
        id={`${idPrefix}warp-strength`}
        label="Domain warp"
        value={layer.noise.warpStrength}
        min={0}
        max={2}
        step={0.05}
        onChange={(value) =>
          updateRouteNoise(layer.id, "warpStrength", value)
        }
      />
      <div className="grid grid-cols-2 gap-2 border-t border-sidebar-border pt-4 text-xs">
        <div>
          <span className="block text-muted-foreground">Seed</span>
          <strong className="font-mono font-medium tabular-nums">
            {layer.noise.seed}
          </strong>
        </div>
        <div>
          <span className="block text-muted-foreground">Mode</span>
          <strong className="font-mono font-medium capitalize">
            {layer.mode}
          </strong>
        </div>
      </div>
    </section>
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

  return (
    <div className="flex h-full min-h-0 flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-sidebar-border px-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">{project.name}</p>
          <p className="font-mono text-[9px] uppercase tracking-[0.13em] text-muted-foreground">
            Local project
          </p>
        </div>
        {showAddAction ? (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Add object (coming in Phase 2)"
            disabled
          >
            <Plus aria-hidden="true" />
          </Button>
        ) : null}
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <nav aria-label="Project objects">
          <ol>
            {project.layers.map((layer, index) => (
              <LayerRow key={layer.id} layer={layer} index={index} />
            ))}
          </ol>
        </nav>
        <Separator />
        <SelectedProperties idPrefix={idPrefix} />
      </ScrollArea>
    </div>
  );
}
