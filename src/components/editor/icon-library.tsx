"use client";

import DOMPurify from "dompurify";
import { FolderOpen, MapPin, RefreshCw, ScatterChart } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { builtinIcons } from "@/lib/builtin-icons";
import type { IconAsset } from "@/lib/project-schema";
import { cn } from "@/lib/utils";
import { useEditorStore } from "@/store/editor-store";

function iconIdFromFile(file: File, index: number) {
  const base = file.name
    .replace(/\.svg$/i, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "icon";
  return `custom-${base}-${Date.now()}-${index}`;
}

export function IconLibrary({ children }: { children: React.ReactNode }) {
  const project = useEditorStore((state) => state.project);
  const selectedIconId = useEditorStore((state) => state.selectedIconId);
  const selectIcon = useEditorStore((state) => state.selectIcon);
  const addIconAssets = useEditorStore((state) => state.addIconAssets);
  const placeSelectedIcon = useEditorStore((state) => state.placeSelectedIcon);
  const scatterSelectedIcon = useEditorStore((state) => state.scatterSelectedIcon);
  const inputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [scatterOptions, setScatterOptions] = useState({
    count: 20,
    seed: 42,
    region: "top" as "whole" | "top" | "selected",
    minSpacing: 3,
    scaleMin: 0.7,
    scaleMax: 1.25,
    rotationMin: -15,
    rotationMax: 15,
  });
  const icons = [...builtinIcons, ...project.iconAssets.map((asset) => ({ ...asset, pack: "Imported" as const }))];

  useEffect(() => {
    const openLibrary = () => setOpen(true);
    window.addEventListener("mapper:open-symbols", openLibrary);
    return () => window.removeEventListener("mapper:open-symbols", openLibrary);
  }, []);

  async function importFiles(files: FileList | null) {
    if (!files?.length) return;
    const assets: IconAsset[] = [];
    for (const [index, file] of Array.from(files).entries()) {
      if (!file.name.toLowerCase().endsWith(".svg")) continue;
      const svg = DOMPurify.sanitize(await file.text(), {
        USE_PROFILES: { svg: true, svgFilters: true },
      });
      if (!svg.includes("<svg")) continue;
      assets.push({ id: iconIdFromFile(file, index), name: file.name.replace(/\.svg$/i, ""), svg });
    }
    addIconAssets(assets);
    if (assets[0]) selectIcon(assets[0].id);
    setStatus(`${assets.length} SVG ${assets.length === 1 ? "icon" : "icons"} imported`);
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent className="w-[min(92vw,34rem)] max-w-none gap-0 p-0 sm:max-w-none">
        <SheetHeader className="border-b p-4">
          <SheetTitle>Symbol library</SheetTitle>
          <SheetDescription>
            Place or scatter Apache-2.0 Carbon symbols and sanitized SVG files.
          </SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-auto p-4">
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {icons.map((icon) => (
              <button
                key={icon.id}
                type="button"
                onClick={() => selectIcon(icon.id)}
                aria-pressed={selectedIconId === icon.id}
                className={cn(
                  "focus-ring grid min-h-24 place-items-center gap-1 rounded-md border bg-card p-2 text-center hover:bg-muted",
                  selectedIconId === icon.id && "border-water bg-accent ring-2 ring-water/30",
                )}
              >
                <span
                  className="size-8 text-foreground [&_svg]:size-full"
                  aria-hidden="true"
                  dangerouslySetInnerHTML={{ __html: icon.svg }}
                />
                <span className="max-w-full truncate text-xs font-semibold">{icon.name}</span>
                <span className="font-mono text-[8px] uppercase tracking-wider text-muted-foreground">
                  {icon.pack}
                </span>
              </button>
            ))}
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".svg,image/svg+xml"
            multiple
            className="sr-only"
            onChange={(event) => importFiles(event.currentTarget.files)}
          />
          <input
            ref={folderInputRef}
            type="file"
            accept=".svg,image/svg+xml"
            multiple
            className="sr-only"
            {...({ webkitdirectory: "", directory: "" } as React.InputHTMLAttributes<HTMLInputElement>)}
            onChange={(event) => importFiles(event.currentTarget.files)}
          />
          {status ? <p role="status" className="mt-4 text-xs text-muted-foreground">{status}</p> : null}
          <fieldset className="mt-5 grid grid-cols-2 gap-3 border-t pt-4">
            <legend className="px-1 text-xs font-bold">Scatter rule</legend>
            <div className="grid gap-1">
              <Label htmlFor="scatter-region">Region</Label>
              <select
                id="scatter-region"
                value={scatterOptions.region}
                onChange={(event) =>
                  setScatterOptions((value) => ({
                    ...value,
                    region: event.currentTarget.value as typeof value.region,
                  }))
                }
                className="focus-ring h-8 rounded-md border bg-background px-2 text-sm"
              >
                <option value="top">Top edge</option>
                <option value="whole">Whole region</option>
                <option value="selected">Around selection</option>
              </select>
            </div>
            <div className="grid gap-1">
              <Label htmlFor="scatter-count">Count</Label>
              <Input id="scatter-count" type="number" min={1} max={2000} value={scatterOptions.count} onChange={(event) => setScatterOptions((value) => ({ ...value, count: Math.min(2000, Math.max(1, Math.round(event.currentTarget.valueAsNumber || 1))) }))} />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="scatter-seed">Seed</Label>
              <div className="flex gap-1">
                <Input id="scatter-seed" type="number" min={0} max={2147483647} value={scatterOptions.seed} onChange={(event) => setScatterOptions((value) => ({ ...value, seed: Math.min(2_147_483_647, Math.max(0, Math.round(event.currentTarget.valueAsNumber || 0))) }))} />
                <Button variant="outline" size="icon" aria-label="Randomize scatter seed" onClick={() => setScatterOptions((value) => ({ ...value, seed: crypto.getRandomValues(new Uint32Array(1))[0] % 2_147_483_648 }))}>
                  <RefreshCw aria-hidden="true" />
                </Button>
              </div>
            </div>
            <div className="grid gap-1">
              <Label htmlFor="scatter-spacing">
                Min spacing {project.kind === "travel" ? "(km)" : `(${project.units})`}
              </Label>
              <Input id="scatter-spacing" type="number" min={0} max={project.kind === "travel" ? 500 : 1000} step={0.5} value={scatterOptions.minSpacing} onChange={(event) => setScatterOptions((value) => ({ ...value, minSpacing: Math.min(project.kind === "travel" ? 500 : 1000, Math.max(0, event.currentTarget.valueAsNumber || 0)) }))} />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="scatter-scale-min">Scale min</Label>
              <Input id="scatter-scale-min" type="number" min={0.1} max={10} step={0.1} value={scatterOptions.scaleMin} onChange={(event) => setScatterOptions((value) => ({ ...value, scaleMin: Math.min(10, Math.max(0.1, event.currentTarget.valueAsNumber || 0.1)) }))} />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="scatter-scale-max">Scale max</Label>
              <Input id="scatter-scale-max" type="number" min={0.1} max={10} step={0.1} value={scatterOptions.scaleMax} onChange={(event) => setScatterOptions((value) => ({ ...value, scaleMax: Math.min(10, Math.max(0.1, event.currentTarget.valueAsNumber || 0.1)) }))} />
            </div>
          </fieldset>
        </div>
        <SheetFooter className="grid shrink-0 grid-cols-1 gap-2 border-t bg-popover p-3 min-[420px]:grid-cols-2">
          <Button className="w-full justify-start" variant="outline" onClick={() => inputRef.current?.click()}>
            <FolderOpen aria-hidden="true" /> Import SVGs
          </Button>
          <Button className="w-full justify-start" variant="outline" onClick={() => folderInputRef.current?.click()}>
            <FolderOpen aria-hidden="true" /> Import folder
          </Button>
          <Button className="w-full justify-start" variant="outline" onClick={() => {
            placeSelectedIcon();
            setOpen(false);
          }}>
            <MapPin aria-hidden="true" /> Place center
          </Button>
          <Button className="w-full justify-start" onClick={() => {
            scatterSelectedIcon(scatterOptions);
            setOpen(false);
          }}>
            <ScatterChart aria-hidden="true" /> Create scatter
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
