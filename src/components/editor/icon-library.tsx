"use client";

import DOMPurify from "dompurify";
import { FolderOpen, MapPin, ScatterChart } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
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
  const icons = [...builtinIcons, ...project.iconAssets.map((asset) => ({ ...asset, pack: "Imported" as const }))];

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
    <Sheet>
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
        </div>
        <SheetFooter className="grid grid-cols-2 gap-2 border-t p-3 sm:grid-cols-4">
          <Button variant="outline" onClick={() => inputRef.current?.click()}>
            <FolderOpen aria-hidden="true" /> Import SVGs
          </Button>
          <Button variant="outline" onClick={() => folderInputRef.current?.click()}>
            <FolderOpen aria-hidden="true" /> Import folder
          </Button>
          <Button variant="outline" onClick={placeSelectedIcon}>
            <MapPin aria-hidden="true" /> Place center
          </Button>
          <Button onClick={() => scatterSelectedIcon(20)}>
            <ScatterChart aria-hidden="true" /> Scatter 20
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
