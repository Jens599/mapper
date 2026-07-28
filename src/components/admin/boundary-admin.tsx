"use client";

import { Copy, Download, MapPinned, Search, Upload } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { boundaryFromGeoJson, fetchOsmBoundary } from "@/lib/boundary-utils";
import type { BoundaryAsset } from "@/lib/project-schema";
import { downloadBlob, safeFilename } from "@/lib/project-io";
import { useEditorStore } from "@/store/editor-store";

function boundaryTs(boundary: BoundaryAsset) {
  return `// Generated from boundary data. Do not fetch at runtime.\nexport const ${boundary.id.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase()).replace(/^boundary/, "boundary")} = ${JSON.stringify(boundary, null, 2)} as const;\n`;
}

function boundarySvg(boundary: BoundaryAsset) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${boundary.viewBox}" role="img" aria-label="${boundary.name}"><path d="${boundary.path}" fill="${boundary.fill}" stroke="${boundary.stroke}" opacity="${boundary.opacity}"/></svg>`;
}

export function BoundaryAdmin() {
  const addBoundaryAsset = useEditorStore((state) => state.addBoundaryAsset);
  const [query, setQuery] = useState("Nepal");
  const [boundary, setBoundary] = useState<BoundaryAsset | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const tsOutput = useMemo(() => boundary ? boundaryTs(boundary) : "", [boundary]);
  const geoJsonOutput = useMemo(() => boundary ? JSON.stringify(boundary, null, 2) : "", [boundary]);
  const svgOutput = useMemo(() => boundary ? boundarySvg(boundary) : "", [boundary]);

  async function searchBoundary() {
    setBusy(true);
    setStatus(null);
    try {
      setBoundary(await fetchOsmBoundary(query));
      setStatus("Boundary loaded from OpenStreetMap.");
    } catch (reason) {
      setStatus(reason instanceof Error ? reason.message : "Boundary lookup failed.");
    } finally {
      setBusy(false);
    }
  }

  async function uploadBoundary(file: File | undefined) {
    if (!file) return;
    try {
      setBoundary(boundaryFromGeoJson(JSON.parse(await file.text()), file.name.replace(/\.geojson|\.json$/i, "")));
      setStatus("Boundary loaded from uploaded GeoJSON.");
    } catch (reason) {
      setStatus(reason instanceof Error ? reason.message : "GeoJSON import failed.");
    }
  }

  async function copy(value: string) {
    await navigator.clipboard.writeText(value);
    setStatus("Copied to clipboard.");
  }

  function saveToProject() {
    if (!boundary) return;
    addBoundaryAsset(boundary);
    setStatus(`${boundary.name} saved to the active project.`);
  }

  return (
    <div className="grid gap-6">
      <section className="grid gap-3 rounded-2xl border bg-card p-4 shadow-sm">
        <div className="grid gap-1.5">
          <Label htmlFor="boundary-query">OSM place boundary</Label>
          <div className="flex gap-2">
            <Input id="boundary-query" value={query} onChange={(event) => setQuery(event.currentTarget.value)} placeholder="Nepal, Gandaki Province..." />
            <Button disabled={busy || !query.trim()} onClick={() => void searchBoundary()}>
              <Search aria-hidden="true" /> Fetch
            </Button>
          </div>
        </div>
        <label className="focus-ring flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border bg-background px-3 text-sm font-medium hover:bg-muted">
          <Upload aria-hidden="true" className="size-4" /> Upload GeoJSON
          <input type="file" accept=".geojson,.json,application/geo+json,application/json" className="sr-only" onChange={(event) => void uploadBoundary(event.currentTarget.files?.[0])} />
        </label>
        {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}
      </section>

      {boundary ? (
        <section className="grid gap-4 rounded-2xl border bg-card p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-terrain">Preview</p>
              <h2 className="mt-1 text-xl font-extrabold text-foreground">{boundary.name}</h2>
              <p className="text-sm text-muted-foreground">{boundary.attribution}</p>
            </div>
            <Button onClick={saveToProject}>
              <MapPinned aria-hidden="true" /> Save to active project
            </Button>
          </div>
          <svg viewBox={boundary.viewBox} className="h-56 w-full rounded-xl border border-border bg-background p-4 text-terrain" role="img" aria-label={boundary.name}>
            <path d={boundary.path} fill="currentColor" stroke="#f97316" strokeWidth="1.5" opacity="0.46" />
          </svg>
          <div className="grid gap-3 md:grid-cols-3">
            {[
              ["TypeScript", tsOutput, `${safeFilename(boundary.name)}-boundary.ts`],
              ["JSON asset", geoJsonOutput, `${safeFilename(boundary.name)}-boundary.json`],
              ["SVG", svgOutput, `${safeFilename(boundary.name)}-boundary.svg`],
            ].map(([label, output, filename]) => (
              <div key={label} className="grid gap-2 rounded-xl border bg-background p-3">
                <p className="text-sm font-bold">{label}</p>
                <textarea readOnly value={output} className="h-36 resize-none rounded-md border bg-card p-2 font-mono text-[10px] text-foreground" />
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => void copy(output)}><Copy aria-hidden="true" /> Copy</Button>
                  <Button size="sm" variant="outline" onClick={() => downloadBlob(new Blob([output], { type: "text/plain;charset=utf-8" }), filename)}><Download aria-hidden="true" /> Save</Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
