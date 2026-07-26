"use client";

import { autocompletion, type CompletionContext } from "@codemirror/autocomplete";
import { yaml } from "@codemirror/lang-yaml";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { linter } from "@codemirror/lint";
import { EditorView } from "@codemirror/view";
import { tags } from "@lezer/highlight";
import { Columns2, FileCode2, Maximize2, X } from "lucide-react";
import dynamic from "next/dynamic";
import {
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
} from "react";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { deserializeProject, serializeProject } from "@/lib/project-io";
import { useEditorStore } from "@/store/editor-store";
import { getIconIds } from "@/lib/icons";

const CodeMirror = dynamic(() => import("@uiw/react-codemirror"), {
  ssr: false,
});

const mapperCompletions = [
  "version", "kind", "id", "name", "durationDays", "subtitle", "presentation",
  "lineScale", "textScale", "symbolScale", "showModeIcons", "map", "display", "style",
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

type BuilderTriggerProps = {
  onClick?: (event: MouseEvent) => void;
};

export function ProjectBuilder({ children }: { children: ReactNode }) {
  const project = useEditorStore((state) => state.project);
  const replaceProject = useEditorStore((state) => state.replaceProject);
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState(() => serializeProject(project));
  const [error, setError] = useState<string | null>(null);
  const [liveStatus, setLiveStatus] = useState("Live preview ready");
  const [pending, startTransition] = useTransition();
  const [desktop, setDesktop] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const userEdited = useRef(false);
  const wasOpen = useRef(false);

  useEffect(() => {
    if (open && !wasOpen.current) {
      setSource(serializeProject(project));
      userEdited.current = false;
      setError(null);
      setLiveStatus("Live preview ready");
    } else if (!open) {
      userEdited.current = false;
    }
    wasOpen.current = open;
  }, [open, project]);

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

  useEffect(() => {
    if (!open || !userEdited.current) return;

    setLiveStatus("Checking YAML...");
    const timeout = window.setTimeout(() => {
      try {
        const nextProject = deserializeProject(source);
        setError(null);
        setLiveStatus("Updating preview...");
        startTransition(() => {
          replaceProject(nextProject);
          setLiveStatus("Preview updated");
        });
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "The YAML project is invalid.");
        setLiveStatus("Preview paused until YAML is valid");
      }
    }, 450);

    return () => window.clearTimeout(timeout);
  }, [open, replaceProject, source]);

  const onChange = useCallback((value: string) => {
    setSource(value);
    userEdited.current = true;
    setLiveStatus("Waiting for edits...");
  }, []);

  function openBuilder() {
    setFullscreen(false);
    setOpen(true);
  }

  const trigger = isValidElement<BuilderTriggerProps>(children)
    ? cloneElement(children as ReactElement<BuilderTriggerProps>, {
        onClick: (event) => {
          children.props.onClick?.(event);
          if (!event.defaultPrevented) openBuilder();
        },
      })
    : (
      <span role="button" tabIndex={0} onClick={openBuilder}>
        {children}
      </span>
    );

  const workspace = (
    <div className="flex size-full min-h-0 flex-col bg-[#1e1e1e] text-[#d4d4d4]">
      <div className="flex min-h-14 shrink-0 items-center gap-3 border-b border-[#2b2b2b] bg-[#181818] px-4 pr-3 shadow-[0_1px_0_rgba(255,255,255,0.04)]">
        <FileCode2 className="size-4 text-[#e8b563]" aria-hidden="true" />
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold text-[#f0f0f0]">Project builder</h2>
          <p className="truncate text-[11px] text-[#9d9d9d]">Live YAML preview</p>
        </div>
        {desktop ? (
          <div className="ml-auto flex items-center gap-1">
            <Button variant="ghost" size="icon-sm" className="text-[#d4d4d4] hover:bg-[#2a2d2e] hover:text-white" onClick={() => setFullscreen(false)} aria-label="Dock Builder to the right">
              <Columns2 aria-hidden="true" />
            </Button>
            <Button variant="ghost" size="icon-sm" className="text-[#d4d4d4] hover:bg-[#2a2d2e] hover:text-white" onClick={() => setFullscreen(true)} aria-label="Make Builder full screen">
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
        <div className={`flex h-6 shrink-0 items-center justify-between px-3 font-mono text-[10px] text-white ${error ? "bg-[#a1260d]" : pending ? "bg-[#8a6c18]" : "bg-[#007acc]"}`}>
          <span>{liveStatus}</span>
          <span>YAML | UTF-8 | Spaces: 2</span>
        </div>
        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-[#2b2b2b] bg-[#181818] p-3">
          <p className="text-[11px] text-[#9d9d9d]">Valid edits update the map automatically.</p>
          <Button variant="ghost" className="text-[#d4d4d4] hover:bg-[#2a2d2e] hover:text-white" onClick={() => setOpen(false)}>
            Close
          </Button>
        </div>
    </div>
  );

  return (
    <>
      {trigger}
      {open && desktop ? (
        <div
          role="dialog"
          aria-modal="false"
          aria-label="Project builder"
          className={fullscreen
            ? "fixed inset-0 z-50 bg-[#1e1e1e]"
            : "fixed bottom-4 right-4 top-20 z-50 w-[min(560px,calc(100vw-2rem))] overflow-hidden rounded-xl border border-white/10 bg-[#1e1e1e] shadow-[-16px_24px_60px_rgba(0,0,0,0.38)]"}
        >
          {workspace}
        </div>
      ) : null}
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
