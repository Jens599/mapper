"use client";

import {
  ChevronDown,
  Download,
  FileCode2,
  FolderOpen,
  HelpCircle,
  Map,
  Shapes,
  Menu,
  Redo2,
  Save,
  Undo2,
  Route,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
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

function ContourMark() {
  return (
    <svg
      viewBox="0 0 34 34"
      className="size-7"
      aria-hidden="true"
      fill="none"
    >
      <path
        d="M3 22c6-8 9 4 15-5s8-3 13-8M3 28c7-7 12 2 17-4s7-5 11-5M4 13c5-6 9 1 14-5s8-3 12-4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="18" cy="17" r="2.5" fill="var(--trail)" />
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
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          aria-label="Open project objects"
        >
          <Menu aria-hidden="true" />
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[78dvh] gap-0 p-0 md:hidden">
        <SheetHeader className="sr-only">
          <SheetTitle>Project objects</SheetTitle>
          <SheetDescription>
            Select layers and edit route generation settings.
          </SheetDescription>
        </SheetHeader>
        <ObjectPanel idPrefix="mobile-" showAddAction={false} />
      </SheetContent>
    </Sheet>
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
        ? "Symbolic travel"
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
              <Route aria-hidden="true" /> Symbolic travel
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => switchProjectMode("trail")}>
              <Route aria-hidden="true" /> Trail sketch
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <ProjectBuilder>
          <Button variant="ghost" size="sm" className="hidden sm:flex">
            <FileCode2 aria-hidden="true" />
            Builder
          </Button>
        </ProjectBuilder>
        <IconLibrary>
          <Button variant="ghost" size="sm" aria-label="Open symbol library">
            <Shapes aria-hidden="true" />
            <span className="hidden lg:inline">Symbols</span>
          </Button>
        </IconLibrary>
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
      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-[19rem] shrink-0 border-r md:block">
          <ObjectPanel />
        </aside>
        <div id="canvas" tabIndex={-1} className="flex min-w-0 flex-1">
          <MapCanvas />
        </div>
      </div>
    </main>
  );
}
