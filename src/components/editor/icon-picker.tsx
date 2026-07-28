"use client";

import { Check, ChevronDown, Loader2, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { mapperDebug } from "@/lib/debug";
import { getCachedSvg, getIconIds, getIconSvg, loadLucideSvg } from "@/lib/icons";
import type { IconAsset } from "@/lib/project-schema";
import { cn } from "@/lib/utils";

type IconPickerProps = {
  value: string | null | undefined;
  onValueChange: (value: string | null) => void;
  customIcons: IconAsset[];
  label?: string;
  allowNone?: boolean;
  placeholder?: string;
};

type IconOption = {
  id: string;
  name: string;
  pack: "Lucide" | "Imported";
  svg: string | null;
};

const lucideIds = getIconIds();

function displayName(id: string) {
  return id
    .replace(/^(carbon|material)-/, "")
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function compact(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function fuzzyScore(option: { id: string; name: string }, query: string) {
  const needle = compact(query);
  if (!needle) return 1;
  const id = compact(option.id);
  const name = compact(option.name);
  const haystack = `${id}${name}`;
  if (id === needle) return 100;
  if (id.startsWith(needle)) return 90;
  if (name.startsWith(needle)) return 80;
  if (id.includes(needle) || name.includes(needle)) return 70;

  let score = 0;
  let cursor = 0;
  for (const character of needle) {
    const next = haystack.indexOf(character, cursor);
    if (next === -1) return 0;
    score += Math.max(1, 12 - (next - cursor));
    cursor = next + 1;
  }
  return score;
}

function IconPreview({ svg, className }: { svg: string | null; className?: string }) {
  if (!svg) {
    return <span className={cn("grid place-items-center text-muted-foreground", className)}>...</span>;
  }
  const source = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  return (
    <span
      className={cn("grid place-items-center text-foreground", className)}
      aria-hidden="true"
    >
      <img src={source} alt="" className="size-full object-contain" draggable={false} />
    </span>
  );
}

export function IconPicker({
  value,
  onValueChange,
  customIcons,
  label = "Icon",
  allowNone = false,
  placeholder = "Search all Lucide icons...",
}: IconPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loadedTick, setLoadedTick] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const requestedIdsRef = useRef(new Set<string>());
  const selectedId = value || null;

  useEffect(() => {
    setHydrated(true);
  }, []);

  const allOptions = useMemo<IconOption[]>(() => {
    void loadedTick;
    const imported = customIcons.map((icon) => ({
      id: icon.id,
      name: icon.name,
      pack: "Imported" as const,
      svg: icon.svg,
    }));
    const lucide = lucideIds.map((id) => ({
      id,
      name: displayName(id),
      pack: "Lucide" as const,
      svg: getCachedSvg(id),
    }));
    return [...imported, ...lucide];
  }, [customIcons, loadedTick]);

  const selected = selectedId
    ? allOptions.find((option) => option.id === selectedId) ?? {
        id: selectedId,
        name: displayName(selectedId),
        pack: "Lucide" as const,
        svg: getIconSvg(selectedId, customIcons),
      }
    : null;

  const results = useMemo(() => {
    const scored = allOptions
      .map((option) => ({ option, score: fuzzyScore(option, query) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score || a.option.name.localeCompare(b.option.name));
    return scored.slice(0, 80).map((item) => item.option);
  }, [allOptions, query]);

  useEffect(() => {
    if (!open && !selectedId) return;
    const ids = new Set<string>();
    if (selectedId && !customIcons.some((icon) => icon.id === selectedId)) ids.add(selectedId);
    if (open) {
      for (const option of results.slice(0, 40)) {
        if (option.pack === "Lucide" && !option.svg) ids.add(option.id);
      }
    }
    for (const id of ids) {
      if (requestedIdsRef.current.has(id)) ids.delete(id);
      else requestedIdsRef.current.add(id);
    }
    if (!ids.size) return;
    mapperDebug("icon-picker", "load requested", {
      label,
      selectedId,
      open,
      ids: [...ids],
    });
    let cancelled = false;
    Promise.all([...ids].map((id) => loadLucideSvg(id))).then((loaded) => {
      mapperDebug("icon-picker", "load completed", {
        label,
        cancelled,
        ids: [...ids],
        loadedCount: loaded.filter(Boolean).length,
      });
      if (!cancelled && loaded.some(Boolean)) setLoadedTick((tick) => tick + 1);
    });
    return () => {
      cancelled = true;
    };
  }, [customIcons, open, results, selectedId]);

  useEffect(() => {
    if (!open) return;
    const closeOnOutside = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", closeOnOutside);
    return () => window.removeEventListener("pointerdown", closeOnOutside);
  }, [open]);

  async function chooseIcon(option: IconOption) {
    mapperDebug("icon-picker", "choose icon", {
      label,
      id: option.id,
      pack: option.pack,
      hasSvg: Boolean(option.svg),
    });
    if (option.pack === "Lucide" && !getCachedSvg(option.id)) {
      await loadLucideSvg(option.id);
      if (getCachedSvg(option.id)) setLoadedTick((tick) => tick + 1);
    }
    onValueChange(option.id);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative grid gap-1.5">
      <Button
        type="button"
        variant="outline"
        className="h-11 w-full justify-between px-3"
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="flex min-w-0 items-center gap-2">
          <IconPreview svg={hydrated ? selected?.svg ?? null : null} className="size-5 shrink-0" />
          <span className="min-w-0 text-left">
            <span className="block truncate text-[13px] font-semibold">
              {selected?.name ?? "No icon"}
            </span>
            <span className="block truncate font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
              {selected?.pack ?? "None"}
            </span>
          </span>
        </span>
        <ChevronDown className="size-4 shrink-0 opacity-60" aria-hidden="true" />
      </Button>
      {open ? (
        <div className="absolute left-1/2 top-full z-50 mt-2 w-[calc(100%+2rem)] max-w-[calc(100vw-1rem)] -translate-x-1/2 overflow-hidden rounded-xl border bg-popover shadow-xl">
          <div className="border-b p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.currentTarget.value)}
                placeholder={placeholder}
                className="h-9 pl-8"
              />
            </div>
          </div>
          <div className="max-h-80 overflow-y-auto overscroll-contain">
            <div className="grid gap-1 p-1.5">
              {allowNone ? (
                <button
                  type="button"
                  className="focus-ring flex min-h-11 items-center gap-2 rounded-lg px-2 text-left hover:bg-muted"
                  onClick={() => {
                    onValueChange(null);
                    setOpen(false);
                  }}
                >
                  <span className="grid size-8 place-items-center rounded-md border border-dashed text-[10px] text-muted-foreground">No</span>
                  <span className="min-w-0 flex-1 text-sm font-semibold">No icon</span>
                  {!selectedId ? <Check className="size-4 text-water" aria-hidden="true" /> : null}
                </button>
              ) : null}
              {results.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={cn(
                    "focus-ring flex min-h-11 items-center gap-2 rounded-lg px-2 text-left hover:bg-muted",
                    selectedId === option.id && "bg-accent",
                  )}
                  onClick={() => void chooseIcon(option)}
                >
                  <IconPreview svg={hydrated ? option.svg : null} className="size-8 shrink-0 rounded-md border bg-card p-1.5" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{option.name}</span>
                    <span className="block truncate font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
                      {option.pack} · {option.id}
                    </span>
                  </span>
                  {!option.svg && option.pack === "Lucide" ? <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden="true" /> : null}
                  {selectedId === option.id ? <Check className="size-4 text-water" aria-hidden="true" /> : null}
                </button>
              ))}
              {!results.length ? (
                <p className="px-3 py-8 text-center text-sm text-muted-foreground">No matching icons.</p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
