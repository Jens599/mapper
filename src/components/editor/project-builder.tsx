"use client";

import { autocompletion, type CompletionContext } from "@codemirror/autocomplete";
import { yaml } from "@codemirror/lang-yaml";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { linter } from "@codemirror/lint";
import { EditorView } from "@codemirror/view";
import { tags } from "@lezer/highlight";
import { Columns2, FileCode2, Maximize2, X } from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { usePanelRef } from "react-resizable-panels";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { deserializeProject, serializeProject } from "@/lib/project-io";
import { useEditorStore } from "@/store/editor-store";
import { getIconIds } from "@/lib/icons";

const CodeMirror = dynamic(() => import("@uiw/react-codemirror"), {
  ssr: false,
});

const mapperCompletions = [
  "version", "kind", "id", "name", "durationDays", "subtitle", "presentation",
  "lineScale", "textScale", "symbolScale", "showModeIcons", "showLineHalo", "showLegend",
  "showTitleBlock", "showMapSilhouette", "showLeaderLines", "emphasizeEndpoints",
  "sequentialDayLabels", "extraArrowheads", "vividTransportColors", "fillCanvas",
  "largerDayText", "map", "display", "style",
  "showContours", "showHillshade", "contourInterval", "elevationUnits", "background",
  "stops", "coordinates", "dayLabel", "icon", "elevation", "labelOffset", "labelAnchor",
  "labelStyle", "fontSize", "bold", "color", "legs", "from",
  "to", "mode", "loopback", "showDayLabel", "iconId", "via", "corridor", "corridorNoise", "page",
  "line", "solid", "dashed", "dotted", "curvature", "winding",
  "noiseSeed", "noiseAmplitude", "noiseScale", "noiseOctaves", "noiseModulation",
  "noise", "enabled", "iconAssets",
  "symbols", "scatter", "seed", "count", "minSpacingKm", "minSpacing", "region",
  "type", "trip-bounds", "map-edge", "north", "south", "east", "west",
  "around-stop", "stopId", "along-leg", "legId", "bounds",
  "padding", "radius", "appearance", "scale", "rotation",
  "canvas", "canvas-edge", "top", "bottom", "left", "right", "around-waypoint",
  "waypointId", "along-route", "routeId", "rectangle",
  "waypoints", "routes", "terrain", "icons", "visible",
].map((label) => ({ label, type: "property" }));

const iconCompletions = getIconIds().map((id) => ({ label: id, type: "constant" }));

function iconValueCompletionSource(context: CompletionContext) {
  const word = context.matchBefore(/[\w-]*/);
  if (!word || (word.from === word.to && !context.explicit)) return null;
  const lineBefore = context.state.sliceDoc(Math.max(0, word.from - 25), word.from);
  if (!/(?:^|\n)\s*(?:icon|iconId|icons):\s*$/.test(lineBefore)) return null;
  return { from: word.from, options: iconCompletions };
}

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

const accessibleYamlHighlight = HighlightStyle.define([
  { tag: [tags.propertyName, tags.attributeName], color: "#9cdcfe" },
  { tag: [tags.string, tags.special(tags.string)], color: "#f0b7a4" },
  { tag: [tags.number, tags.bool, tags.null], color: "#b5d6a2" },
  { tag: [tags.keyword, tags.atom], color: "#c7a0dc" },
  { tag: [tags.comment, tags.lineComment, tags.blockComment], color: "#86b778" },
  { tag: [tags.punctuation, tags.separator, tags.bracket], color: "#d4d4d4" },
  { tag: tags.invalid, color: "#ff9b9b", textDecoration: "underline" },
]);

export function ProjectBuilder({ children }: { children: React.ReactNode }) {
  const project = useEditorStore((state) => state.project);
  const replaceProject = useEditorStore((state) => state.replaceProject);
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState(() => serializeProject(project));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [desktop, setDesktop] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const editorPanelRef = usePanelRef();
  const userEdited = useRef(false);

  useEffect(() => {
    if (open) {
      setSource(serializeProject(project));
      userEdited.current = false;
    } else {
      userEdited.current = false;
    }
  }, [open]);

  useEffect(() => {
    if (open && !userEdited.current) {
      setSource(serializeProject(project));
    }
  }, [open, project]);

  useEffect(() => {
    const query = window.matchMedia("(min-width: 768px)");
    const update = () => setDesktop(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  function showHalfScreen() {
    setFullscreen(false);
    requestAnimationFrame(() => editorPanelRef.current?.resize("50%"));
  }

  function showFullScreen() {
    setFullscreen(true);
    requestAnimationFrame(() => editorPanelRef.current?.resize("100%"));
  }

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

  const onChange = useCallback((value: string) => {
    setSource(value);
    userEdited.current = true;
  }, []);

  const workspace = (
    <div className="flex size-full min-h-0 flex-col bg-[#1e1e1e] text-[#d4d4d4]">
      <div className="flex min-h-14 shrink-0 items-center gap-3 border-b border-[#2b2b2b] bg-[#181818] px-4 pr-3">
        <FileCode2 className="size-4 text-[#e8b563]" aria-hidden="true" />
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold text-[#f0f0f0]">Project builder</h2>
          <p className="truncate text-[11px] text-[#9d9d9d]">Validated Mapper YAML</p>
        </div>
        {desktop ? (
          <div className="ml-auto flex items-center gap-1">
            <Button variant="ghost" size="icon-sm" className="text-[#d4d4d4] hover:bg-[#2a2d2e] hover:text-white" onClick={showHalfScreen} aria-label="Set Builder to half screen">
              <Columns2 aria-hidden="true" />
            </Button>
            <Button variant="ghost" size="icon-sm" className="text-[#d4d4d4] hover:bg-[#2a2d2e] hover:text-white" onClick={showFullScreen} aria-label="Make Builder full screen">
              <Maximize2 aria-hidden="true" />
            </Button>
            <Button variant="ghost" size="icon-sm" className="text-[#d4d4d4] hover:bg-[#2a2d2e] hover:text-white" onClick={() => setOpen(false)} aria-label="Close Builder">
              <X aria-hidden="true" />
            </Button>
          </div>
        ) : (
          <Button variant="ghost" size="icon-sm" className="ml-auto text-[#d4d4d4] hover:bg-[#2a2d2e] hover:text-white" onClick={() => setOpen(false)} aria-label="Close Builder">
            <X aria-hidden="true" />
          </Button>
        )}
      </div>
        <div className="flex h-9 shrink-0 items-end border-b border-[#2b2b2b] bg-[#181818] px-2">
          <div className="flex h-8 items-center gap-2 border-t border-[#007acc] bg-[#1e1e1e] px-3 font-mono text-[11px] text-[#d4d4d4]">
            <FileCode2 className="size-3.5 text-[#e8b563]" aria-hidden="true" />
            {project.id}.mapper.yaml
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-auto bg-[#1e1e1e]">
          <CodeMirror
            value={source}
            height="100%"
            theme={vscodeTheme}
            extensions={[
              yaml(),
              syntaxHighlighting(accessibleYamlHighlight),
              autocompletion({ override: [iconValueCompletionSource, mapperCompletionSource] }),
              linter((view) => {
                try {
                  deserializeProject(view.state.doc.toString());
                  return [];
                } catch {
                  return [
                    {
                      from: 0,
                      to: view.state.doc.length,
                      severity: "error",
                      message: "Project YAML is invalid",
                    },
                  ];
                }
              }, { delay: 400 }),
              EditorView.lineWrapping,
            ]}
            onChange={onChange}
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
          <span>Mapper YAML</span>
          <span>YAML | UTF-8 | Spaces: 2</span>
        </div>
        <div className="flex shrink-0 justify-end gap-2 border-t border-[#2b2b2b] bg-[#181818] p-3">
          <Button variant="ghost" className="text-[#d4d4d4] hover:bg-[#2a2d2e] hover:text-white" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={applySource} disabled={pending}>
            {pending ? "Applying..." : "Apply YAML"}
          </Button>
        </div>
    </div>
  );

  return (
    <>
      <span className="contents" onClick={() => {
        setFullscreen(false);
        setOpen(true);
      }}>{children}</span>
      <Dialog open={open && desktop} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton={false}
          className={fullscreen
            ? "inset-0 size-full max-w-none translate-x-0 translate-y-0 rounded-none bg-transparent p-0 ring-0"
            : "inset-0 bottom-0 left-0 top-0 h-full w-full max-w-none translate-x-0 translate-y-0 rounded-none bg-transparent p-0 ring-0"}
        >
          <DialogTitle className="sr-only">Project builder</DialogTitle>
          <DialogDescription className="sr-only">Edit and validate the active project YAML.</DialogDescription>
          <ResizablePanelGroup orientation="horizontal" className="size-full">
            <ResizablePanel defaultSize="50%" minSize="0%" className="bg-black/40" />
            <ResizableHandle withHandle className="bg-[#454545]" onDoubleClick={showHalfScreen} />
            <ResizablePanel
              panelRef={editorPanelRef}
              defaultSize="50%"
              minSize="30%"
              maxSize="80%"
              className="shadow-[-10px_0_30px_rgba(0,0,0,0.35)]"
            >
              {workspace}
            </ResizablePanel>
          </ResizablePanelGroup>
        </DialogContent>
      </Dialog>
      <Drawer open={open && !desktop} onOpenChange={setOpen} direction="bottom">
        <DrawerContent className="h-dvh max-h-none rounded-none border-0 p-0">
          <DrawerHeader className="sr-only">
            <DrawerTitle>Project builder</DrawerTitle>
            <DrawerDescription>Edit and validate the active project YAML.</DrawerDescription>
          </DrawerHeader>
          {workspace}
        </DrawerContent>
      </Drawer>
    </>
  );
}
