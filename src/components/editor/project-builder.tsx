"use client";

import { Columns2, FileCode2, Maximize2, X } from "lucide-react";
import dynamic from "next/dynamic";
import type { OnMount } from "@monaco-editor/react";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

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
import { deserializeProject, serializeProject } from "@/lib/project-io";
import { configureMapperMonaco } from "@/lib/monaco-setup";
import { useEditorStore } from "@/store/editor-store";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="flex size-full items-center justify-center bg-[#1e1e1e] font-mono text-xs text-[#9d9d9d]">
      Loading Monaco...
    </div>
  ),
});

export function ProjectBuilder({ children }: { children: React.ReactNode }) {
  const project = useEditorStore((state) => state.project);
  const replaceProject = useEditorStore((state) => state.replaceProject);
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState(() => serializeProject(project));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [desktop, setDesktop] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [builderWidth, setBuilderWidth] = useState(760);
  const [editorHeight, setEditorHeight] = useState(480);
  const [plainEditor, setPlainEditor] = useState(true);
  const [monacoReady, setMonacoReady] = useState(false);
  const editorBodyRef = useRef<HTMLDivElement>(null);
  const userEdited = useRef(false);

  useEffect(() => {
    if (open) {
      setSource(serializeProject(project));
      userEdited.current = false;
      setPlainEditor(true);
      setMonacoReady(false);
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

  useEffect(() => {
    if (!open || !editorBodyRef.current) return;
    const update = () => {
      const height = editorBodyRef.current?.clientHeight ?? 0;
      if (height > 0) setEditorHeight(height);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(editorBodyRef.current);
    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [open, desktop, fullscreen, builderWidth]);

  useEffect(() => {
    if (!open || plainEditor || monacoReady) return;
    const timeout = window.setTimeout(() => setPlainEditor(true), 4_000);
    return () => window.clearTimeout(timeout);
  }, [open, plainEditor, monacoReady]);

  function showHalfScreen() {
    setFullscreen(false);
    setBuilderWidth(Math.round(window.innerWidth * 0.5));
  }

  function showFullScreen() {
    setFullscreen(true);
  }

  function startResize(event: React.PointerEvent<HTMLDivElement>) {
    event.preventDefault();
    const move = (pointerEvent: PointerEvent) => {
      const minWidth = Math.min(560, window.innerWidth - 32);
      const maxWidth = window.innerWidth - 32;
      setBuilderWidth(Math.min(maxWidth, Math.max(minWidth, window.innerWidth - pointerEvent.clientX)));
    };
    const stop = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
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

  function getProjectError(value: string) {
    try {
      deserializeProject(value);
      return null;
    } catch (reason) {
      return reason instanceof Error ? reason.message : "Project YAML is invalid";
    }
  }

  const onChange = useCallback((value: string) => {
    setSource(value);
    userEdited.current = true;
  }, []);

  const handleEditorMount = useCallback<OnMount>((editor, monaco) => {
    configureMapperMonaco(monaco);
    setMonacoReady(true);
    editor.layout();
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
        <div ref={editorBodyRef} className="min-h-0 flex-1 overflow-hidden bg-[#1e1e1e]">
          {plainEditor ? (
            <textarea
              value={source}
              onChange={(event) => onChange(event.currentTarget.value)}
              spellCheck={false}
              className="size-full resize-none bg-[#1e1e1e] p-4 font-mono text-[13px] leading-5 text-[#d4d4d4] outline-none selection:bg-[#264f78]"
              aria-label="Project YAML source"
            />
          ) : (
            <MonacoEditor
              value={source}
              height={`${editorHeight}px`}
              language="yaml"
              path={`${project.id}.mapper.yaml`}
              theme="mapper-dark"
              beforeMount={configureMapperMonaco}
              onMount={handleEditorMount}
              onChange={(value) => onChange(value ?? "")}
              options={{
                automaticLayout: true,
                fontFamily: "var(--font-plex-mono), Consolas, monospace",
                fontSize: 13,
                lineNumbers: "on",
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                smoothScrolling: true,
                tabSize: 2,
                insertSpaces: true,
                wordWrap: "off",
                wrappingIndent: "none",
                scrollbar: {
                  vertical: "visible",
                  horizontal: "visible",
                  useShadows: false,
                },
                overviewRulerLanes: 0,
                renderLineHighlight: "line",
                fixedOverflowWidgets: true,
              }}
            />
          )}
        </div>
        {error ? (
          <p role="alert" className="border-t border-destructive/40 bg-destructive/10 px-4 py-2 text-xs text-destructive">
            {error}
          </p>
        ) : null}
        <div className="flex h-6 shrink-0 items-center justify-between bg-[#007acc] px-3 font-mono text-[10px] text-white">
          <span>Mapper YAML</span>
          <button type="button" className="underline-offset-2 hover:underline" onClick={() => setPlainEditor((current) => !current)}>
            {plainEditor ? "Plain editor" : "Monaco editor"} | UTF-8 | Spaces: 2
          </button>
        </div>
        <div className="relative z-10 flex shrink-0 justify-end gap-2 border-t border-[#2b2b2b] bg-[#181818] p-3 shadow-[0_-8px_20px_rgba(0,0,0,0.25)]">
          <Button variant="ghost" className="text-[#d4d4d4] hover:bg-[#2a2d2e] hover:text-white" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button className="bg-[#e26d45] text-white hover:bg-[#f17d55]" onClick={applySource} disabled={pending}>
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
            ? "!inset-0 !left-0 !top-0 !flex size-full max-w-none !translate-x-0 !translate-y-0 overflow-hidden rounded-none bg-transparent p-0 ring-0"
            : "!inset-0 !left-0 !top-0 !flex h-full w-full max-w-none !translate-x-0 !translate-y-0 overflow-hidden rounded-none bg-transparent p-0 ring-0"}
        >
          <DialogTitle className="sr-only">Project builder</DialogTitle>
          <DialogDescription className="sr-only">Edit and validate the active project YAML.</DialogDescription>
          {fullscreen ? (
            <div className="size-full shadow-[-10px_0_30px_rgba(0,0,0,0.35)]">
              {workspace}
            </div>
          ) : (
            <div className="flex size-full">
              <div className="min-w-0 flex-1 bg-black/35" />
              <div
                role="separator"
                aria-orientation="vertical"
                aria-label="Resize Builder"
                tabIndex={0}
                onPointerDown={startResize}
                onDoubleClick={showHalfScreen}
                className="group relative z-10 flex w-2 cursor-col-resize items-center justify-center bg-[#343434] outline-none focus-visible:ring-2 focus-visible:ring-[#007acc]"
              >
                <span className="h-10 w-1 rounded-full bg-[#6a6a6a] transition-colors group-hover:bg-[#9a9a9a]" />
              </div>
              <section
                className="h-full min-w-0 shadow-[-10px_0_30px_rgba(0,0,0,0.35)]"
                style={{ width: builderWidth, maxWidth: "calc(100vw - 2rem)", minWidth: "min(35rem, calc(100vw - 2rem))" }}
              >
                {workspace}
              </section>
            </div>
          )}
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
