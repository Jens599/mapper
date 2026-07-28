"use client";

import {
  ChevronDown,
  Download,
  FileCode2,
  FolderOpen,
  HelpCircle,
  Map,
  MapPinned,
  MapPin,
  Mountain,
  PanelLeftOpen,
  Shapes,
  Menu,
  Redo2,
  Save,
  Undo2,
  Route,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePanelRef } from "react-resizable-panels";

import { MapCanvas } from "@/components/editor/map-canvas";
import { IconLibrary } from "@/components/editor/icon-library";
import { ObjectPanel } from "@/components/editor/object-panel";
import { ProjectBuilder } from "@/components/editor/project-builder";
import { ThemeToggle } from "@/components/editor/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  exportCoordinatesCsv,
  exportPng,
  exportSvgWithBackground,
  exportTransparentSvg,
} from "@/lib/export-project";
import {
  deserializeProject,
  downloadBlob,
  safeFilename,
  serializeProject,
} from "@/lib/project-io";
import { useProjectAutosave } from "@/hooks/use-project-autosave";
import { useEditorStore } from "@/store/editor-store";
import { preloadIconsAsync } from "@/lib/icons";

function ContourMark() {
  return (
    <svg
      viewBox="0 0 34 34"
      className="size-7"
      aria-hidden="true"
      fill="none"
    >
      <rect x="3" y="3" width="28" height="28" rx="8" fill="var(--card)" stroke="currentColor" strokeWidth="1.6" />
      <path d="M9 22 14 14l4 5 3-4 5 7" stroke="var(--terrain)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 25c5-5 9 3 14-3 2.3-2.7 3.5-3.8 5-4" stroke="var(--water)" strokeWidth="2" strokeLinecap="round" />
      <circle cx="14" cy="14" r="2.4" fill="var(--trail)" />
      <path d="M24 9v6M21 12h6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function IconAction({
  label,
  children,
  disabled,
}: {
  label: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={label}
          disabled={disabled}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function MobileObjectSheet() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 768px)");
    const closeAtDesktop = (event: MediaQueryListEvent) => {
      if (event.matches) setOpen(false);
    };

    desktop.addEventListener("change", closeAtDesktop);
    return () => desktop.removeEventListener("change", closeAtDesktop);
  }, []);

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          aria-label="Open project objects"
        >
          <Menu aria-hidden="true" />
        </Button>
      </DrawerTrigger>
      <DrawerContent className="h-[82dvh] p-0 md:hidden">
        <DrawerHeader className="sr-only">
          <DrawerTitle>Project objects</DrawerTitle>
          <DrawerDescription>
            Select layers and edit route generation settings.
          </DrawerDescription>
        </DrawerHeader>
        <ObjectPanel idPrefix="mobile-" showAddAction={false} onObjectSelected={() => setOpen(false)} />
        <DrawerFooter className="border-t p-2">
          <DrawerClose asChild><Button variant="outline">Done</Button></DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

function TopBar() {
  const project = useEditorStore((state) => state.project);
  const replaceProject = useEditorStore((state) => state.replaceProject);
  const switchProjectMode = useEditorStore((state) => state.switchProjectMode);
  const setTravelDisplay = useEditorStore((state) => state.setTravelDisplay);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);
  const projectModeLabel =
    project.kind === "trail"
      ? "Trail sketch"
      : project.map.display === "symbolic"
        ? "No map"
        : "Travel map";

  async function openProject(file: File | undefined) {
    if (!file) return;
    try {
      replaceProject(deserializeProject(await file.text()));
      setStatus(`Opened ${file.name}`);
    } catch (reason) {
      setStatus(reason instanceof Error ? reason.message : "Project could not be opened.");
    }
  }

  function saveProject() {
    downloadBlob(
      new Blob([serializeProject(project)], { type: "application/yaml;charset=utf-8" }),
      `${safeFilename(project.name)}.mapper.yaml`,
    );
    setStatus("Project YAML saved");
  }

  async function runExport(action: () => void | Promise<void>, label: string) {
    try {
      await action();
      setStatus(`${label} exported`);
    } catch (reason) {
      setStatus(reason instanceof Error ? reason.message : `${label} export failed`);
    }
  }

  return (
    <header className="z-20 flex h-12 shrink-0 items-center border-b bg-card/95 px-2 shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_4%,transparent)] backdrop-blur-sm">
      <div className="flex min-w-0 items-center gap-1.5 pr-2 md:w-[19rem] md:border-r md:border-border">
        <MobileObjectSheet />
        <span className="text-terrain">
          <ContourMark />
        </span>
        <div className="min-w-0 leading-none">
          <span className="block truncate text-sm font-extrabold tracking-tight">
            Mapper
          </span>
          <span className="hidden font-mono text-[8px] uppercase tracking-[0.16em] text-muted-foreground sm:block">
            Travel & trail studio
          </span>
        </div>
      </div>

      <div className="ml-1 hidden items-center gap-0.5 sm:flex">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Open YAML project"
          onClick={() => fileInputRef.current?.click()}
        >
          <FolderOpen aria-hidden="true" />
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".yaml,.yml,.json,application/yaml,application/json"
          className="sr-only"
          onChange={(event) => openProject(event.currentTarget.files?.[0])}
        />
        <Button variant="ghost" size="icon-sm" aria-label="Save project YAML" onClick={saveProject}>
          <Save aria-hidden="true" />
        </Button>
        <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />
        <IconAction label="Undo" disabled>
          <Undo2 aria-hidden="true" />
        </IconAction>
        <IconAction label="Redo" disabled>
          <Redo2 aria-hidden="true" />
        </IconAction>
      </div>

      <div className="ml-auto flex items-center gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              aria-label={`Switch project mode, currently ${projectModeLabel}`}
            >
              {project.kind === "travel" ? <Map aria-hidden="true" /> : <Route aria-hidden="true" />}
              <span className="hidden md:inline">
                {projectModeLabel}
              </span>
              <ChevronDown aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Project mode</DropdownMenuLabel>
            <DropdownMenuItem
              onSelect={() => {
                switchProjectMode("travel");
                setTravelDisplay("geographic");
              }}
            >
              <Map aria-hidden="true" /> Travel map
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => {
                switchProjectMode("travel");
                setTravelDisplay("symbolic");
              }}
            >
              <Route aria-hidden="true" /> No map
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => switchProjectMode("trail")}>
              <Route aria-hidden="true" /> Trail sketch
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <ProjectBuilder>
          <Button variant="ghost" size="sm" aria-label="Open project Builder">
            <FileCode2 aria-hidden="true" />
            <span className="hidden sm:inline">Builder</span>
          </Button>
        </ProjectBuilder>
        <IconLibrary>
          <Button variant="ghost" size="sm" aria-label="Open symbol library">
            <Shapes aria-hidden="true" />
            <span className="hidden lg:inline">Symbols</span>
          </Button>
        </IconLibrary>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/boundaries" aria-label="Open boundary admin">
            <MapPinned aria-hidden="true" />
            <span className="hidden lg:inline">Boundaries</span>
          </Link>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm">
              <Download aria-hidden="true" />
              Export
              <ChevronDown aria-hidden="true" className="opacity-70" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Export drawing</DropdownMenuLabel>
            <DropdownMenuItem onSelect={() => runExport(() => exportTransparentSvg(project), "Transparent SVG")}>
              SVG, transparent
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => runExport(() => exportSvgWithBackground(project), "Background SVG")}>
              SVG, with background
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => runExport(() => exportPng(project), "PNG")}>
              PNG image
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={saveProject}>Project YAML</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => runExport(() => exportCoordinatesCsv(project), "CSV")}>
              Coordinates CSV
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <ThemeToggle />
        <Button variant="ghost" size="icon-sm" asChild>
          <Link href="/help" aria-label="Open help documentation">
            <HelpCircle aria-hidden="true" />
          </Link>
        </Button>
      </div>
      <p className="sr-only" aria-live="polite">{status}</p>
    </header>
  );
}

export function EditorShell() {
  useProjectAutosave();
  useEffect(() => { preloadIconsAsync(); }, []);
  const project = useEditorStore((state) => state.project);
  const selectObject = useEditorStore((state) => state.selectObject);
  const deleteSelectedObjects = useEditorStore((state) => state.deleteSelectedObjects);
  const railRef = usePanelRef();
  const [railCollapsed, setRailCollapsed] = useState(false);
  const [desktop, setDesktop] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(min-width: 768px)");
    const update = () => setDesktop(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!desktop) return;
    const savedWidth = Number(window.localStorage.getItem("mapper-object-rail-width"));
    const collapsed = window.localStorage.getItem("mapper-object-rail-collapsed") === "true";
    requestAnimationFrame(() => {
      if (collapsed) railRef.current?.collapse();
      else if (savedWidth >= 240 && savedWidth <= 480) railRef.current?.resize(savedWidth);
    });
  }, [desktop, railRef]);

  useEffect(() => {
    const deleteWithKeyboard = (event: KeyboardEvent) => {
      if (event.key !== "Delete" && event.key !== "Backspace") return;
      const target = event.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      ) return;
      event.preventDefault();
      deleteSelectedObjects();
    };
    window.addEventListener("keydown", deleteWithKeyboard);
    return () => window.removeEventListener("keydown", deleteWithKeyboard);
  }, [deleteSelectedObjects]);

  return (
    <main className="flex h-dvh min-h-0 flex-col overflow-hidden">
      <h1 className="sr-only">Mapper travel and trail editor</h1>
      <a
        href="#canvas"
        className="focus-ring sr-only z-50 bg-popover px-3 py-2 focus:not-sr-only focus:absolute focus:left-2 focus:top-2"
      >
        Skip to canvas
      </a>
      <TopBar />
      {desktop ? (
      <ResizablePanelGroup orientation="horizontal" className="min-h-0 flex-1">
        <ResizablePanel
          panelRef={railRef}
          defaultSize={304}
          minSize={240}
          maxSize={480}
          collapsible
          collapsedSize={48}
          className="border-r"
          onResize={(size) => {
            const collapsed = size.inPixels <= 52;
            setRailCollapsed(collapsed);
            window.localStorage.setItem("mapper-object-rail-collapsed", String(collapsed));
            if (!collapsed) {
              window.localStorage.setItem("mapper-object-rail-width", String(size.inPixels));
            }
          }}
        >
          {railCollapsed ? (
            <aside className="flex h-full flex-col items-center gap-1 bg-sidebar py-2">
              <Button variant="ghost" size="icon-sm" aria-label="Expand object rail" onClick={() => railRef.current?.expand()}>
                <PanelLeftOpen aria-hidden="true" />
              </Button>
              <div className="my-1 h-px w-6 bg-sidebar-border" />
              <Button variant="ghost" size="icon-sm" aria-label={project.kind === "travel" ? "Select first stop" : "Select first waypoint"} onClick={() => {
                const id = project.kind === "travel" ? project.stops[0]?.id : project.waypoints[0]?.id;
                if (id) selectObject(id);
              }}>
                <MapPin aria-hidden="true" />
              </Button>
              <Button variant="ghost" size="icon-sm" aria-label={project.kind === "travel" ? "Select first travel leg" : "Select first trail route"} onClick={() => {
                const id = project.kind === "travel" ? project.legs[0]?.id : project.routes[0]?.id;
                if (id) selectObject(id);
              }}>
                <Route aria-hidden="true" />
              </Button>
              <Button variant="ghost" size="icon-sm" aria-label="Select terrain" onClick={() => selectObject(project.kind === "travel" ? "terrain-context" : "trail-terrain")}>
                <Mountain aria-hidden="true" />
              </Button>
            </aside>
          ) : (
            <aside className="h-full"><ObjectPanel onCollapse={() => railRef.current?.collapse()} /></aside>
          )}
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel minSize={320}>
          <div id="canvas" tabIndex={-1} className="flex size-full min-w-0">
            <MapCanvas />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
      ) : (
        <div id="canvas" tabIndex={-1} className="flex min-h-0 min-w-0 flex-1">
          <MapCanvas />
        </div>
      )}
    </main>
  );
}
