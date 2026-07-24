"use client";

import { autocompletion, type CompletionContext } from "@codemirror/autocomplete";
import { yaml } from "@codemirror/lang-yaml";
import { linter } from "@codemirror/lint";
import { EditorView } from "@codemirror/view";
import { FileCode2 } from "lucide-react";
import dynamic from "next/dynamic";
import { useDeferredValue, useEffect, useState, useTransition } from "react";

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
import { deserializeProject, serializeProject } from "@/lib/project-io";
import { useEditorStore } from "@/store/editor-store";

const CodeMirror = dynamic(() => import("@uiw/react-codemirror"), {
  ssr: false,
});

const mapperCompletions = [
  "version", "kind", "id", "name", "durationDays", "subtitle", "presentation",
  "lineScale", "textScale", "symbolScale", "map", "display", "style",
  "showContours", "showHillshade", "contourInterval", "elevationUnits", "stops",
  "coordinates", "dayLabel", "icon", "elevation", "labelOffset", "legs", "from",
  "to", "mode", "via", "line", "curvature", "winding", "color", "iconAssets",
  "symbols", "scatter", "seed", "count", "minSpacingKm", "minSpacing", "region",
  "type", "trip-bounds", "map-edge", "north", "south", "east", "west",
  "around-stop", "along-leg", "bounds", "appearance", "scale", "rotation",
  "canvas", "canvas-edge", "top", "bottom", "left", "right", "around-waypoint",
  "along-route", "rectangle", "waypoints", "routes", "terrain", "icons", "visible",
].map((label) => ({ label, type: "property" }));

function mapperCompletionSource(context: CompletionContext) {
  const word = context.matchBefore(/[\w-]*/);
  if (!word || (word.from === word.to && !context.explicit)) return null;
  return { from: word.from, options: mapperCompletions };
}

const vscodeTheme = EditorView.theme(
  {
    "&": { backgroundColor: "#1e1e1e", color: "#d4d4d4", fontSize: "13px" },
    ".cm-content": { caretColor: "#aeafad", fontFamily: "var(--font-plex-mono), monospace" },
    ".cm-cursor, .cm-dropCursor": { borderLeftColor: "#aeafad" },
    ".cm-gutters": { backgroundColor: "#1e1e1e", color: "#858585", border: "none" },
    ".cm-activeLine": { backgroundColor: "#2a2d2e" },
    ".cm-activeLineGutter": { backgroundColor: "#2a2d2e", color: "#c6c6c6" },
    ".cm-selectionBackground": { backgroundColor: "#264f78 !important" },
    ".cm-tooltip": { backgroundColor: "#252526", border: "1px solid #454545" },
    ".cm-tooltip-autocomplete > ul > li[aria-selected]": { backgroundColor: "#04395e" },
  },
  { dark: true },
);

export function ProjectBuilder({ children }: { children: React.ReactNode }) {
  const project = useEditorStore((state) => state.project);
  const replaceProject = useEditorStore((state) => state.replaceProject);
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState(() => serializeProject(project));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const deferredSource = useDeferredValue(source);
  let valid = true;
  try {
    deserializeProject(deferredSource);
  } catch {
    valid = false;
  }

  useEffect(() => {
    if (open) setSource(serializeProject(project));
  }, [open, project]);

  function applySource() {
    try {
      const nextProject = deserializeProject(source);
      setError(null);
      startTransition(() => {
        replaceProject(nextProject);
        setOpen(false);
      });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The YAML project is invalid.");
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent className="w-[min(92vw,42rem)] max-w-none gap-0 p-0 sm:max-w-none">
        <SheetHeader className="border-b p-4">
          <SheetTitle>Project builder</SheetTitle>
          <SheetDescription>
            Edit the versioned YAML source. Applying replaces the active project.
          </SheetDescription>
        </SheetHeader>
        <div className="flex h-9 shrink-0 items-end border-b border-[#2b2b2b] bg-[#181818] px-2">
          <div className="flex h-8 items-center gap-2 border-t border-[#007acc] bg-[#1e1e1e] px-3 font-mono text-[11px] text-[#d4d4d4]">
            <FileCode2 className="size-3.5 text-[#e8b563]" aria-hidden="true" />
            {project.id}.mapper.yaml
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-auto bg-[#1e1e1e]">
          <CodeMirror
            value={source}
            height="calc(100dvh - 10rem)"
            theme={vscodeTheme}
            extensions={[
              yaml(),
              autocompletion({ override: [mapperCompletionSource] }),
              linter((view) => {
                try {
                  deserializeProject(view.state.doc.toString());
                  return [];
                } catch (reason) {
                  return [
                    {
                      from: 0,
                      to: Math.min(1, view.state.doc.length),
                      severity: "error",
                      message:
                        reason instanceof Error
                          ? reason.message
                          : "Project YAML is invalid",
                    },
                  ];
                }
              }, { delay: 400 }),
              EditorView.lineWrapping,
            ]}
            onChange={setSource}
            basicSetup={{
              lineNumbers: true,
              foldGutter: true,
              highlightActiveLine: true,
            }}
          />
        </div>
        {error ? (
          <p role="alert" className="border-t border-destructive/40 bg-destructive/10 px-4 py-2 text-xs text-destructive">
            {error}
          </p>
        ) : null}
        <div className="flex h-6 shrink-0 items-center justify-between bg-[#007acc] px-3 font-mono text-[10px] text-white">
          <span>{valid ? "Valid Mapper project" : "Schema errors"}</span>
          <span>YAML | UTF-8 | Spaces: 2</span>
        </div>
        <SheetFooter className="flex-row justify-end border-t p-3">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={applySource} disabled={pending}>
            {pending ? "Applying..." : "Apply YAML"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
