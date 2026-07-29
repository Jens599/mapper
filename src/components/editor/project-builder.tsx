"use client";

import type { OnMount } from "@monaco-editor/react";
import { Columns2, FileCode2, Maximize2, Minimize2, X } from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { deserializeProject, serializeProject } from "@/lib/project-io";
import { configureMapperMonaco } from "@/lib/monaco-setup";
import { useEditorStore } from "@/store/editor-store";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="flex size-full items-center justify-center bg-[#171717] font-mono text-xs text-[#a7a7a7]">
      Loading Monaco editor...
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
  const [fullscreen, setFullscreen] = useState(false);
  const [plainEditor, setPlainEditor] = useState(false);
  const userEdited = useRef(false);

  useEffect(() => {
    if (!open) return;
    setSource(serializeProject(project));
    setError(null);
    setPlainEditor(false);
    userEdited.current = false;
  }, [open]);

  useEffect(() => {
    if (open && !userEdited.current) setSource(serializeProject(project));
  }, [open, project]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "enter") applySource();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, source]);

  function onChange(value: string) {
    userEdited.current = true;
    setSource(value);
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

  const handleEditorMount = useCallback<OnMount>((editor, monaco) => {
    configureMapperMonaco(monaco);
    editor.layout();
    editor.focus();
  }, []);

  return (
    <>
      <span className="contents" onClick={() => setOpen(true)}>{children}</span>
      {open ? (
        <div className="fixed inset-0 z-50 flex bg-black/55 text-[#d4d4d4] backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Project builder">
          <div className="hidden min-w-0 flex-1 md:block" onClick={() => setOpen(false)} />
          <section
            className="flex h-full w-full min-w-0 flex-col border-l border-[#363636] bg-[#171717] shadow-[-18px_0_40px_rgba(0,0,0,0.45)] md:w-[min(58rem,92vw)]"
            style={fullscreen ? { width: "100vw" } : undefined}
          >
            <header className="flex min-h-16 shrink-0 items-center gap-3 border-b border-[#303030] bg-[#121212] px-4">
              <div className="flex size-8 items-center justify-center rounded-md border border-[#3b3b3b] bg-[#1f1f1f] text-[#e8b563]">
                <FileCode2 className="size-4" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-sm font-semibold text-white">Project builder</h2>
                <p className="truncate text-[11px] text-[#a7a7a7]">Edit validated Mapper YAML</p>
              </div>
              <div className="ml-auto flex items-center gap-1">
                <Button variant="ghost" size="sm" className="hidden text-[#d4d4d4] hover:bg-[#2a2d2e] hover:text-white md:inline-flex" onClick={() => setFullscreen(false)} aria-label="Use side panel">
                  <Columns2 aria-hidden="true" /> Side
                </Button>
                <Button variant="ghost" size="sm" className="hidden text-[#d4d4d4] hover:bg-[#2a2d2e] hover:text-white md:inline-flex" onClick={() => setFullscreen((value) => !value)} aria-label={fullscreen ? "Exit full screen" : "Use full screen"}>
                  {fullscreen ? <Minimize2 aria-hidden="true" /> : <Maximize2 aria-hidden="true" />}
                  {fullscreen ? "Exit" : "Full"}
                </Button>
                <Button variant="ghost" size="icon-sm" className="text-[#d4d4d4] hover:bg-[#2a2d2e] hover:text-white" onClick={() => setOpen(false)} aria-label="Close Builder">
                  <X aria-hidden="true" />
                </Button>
              </div>
            </header>

            <div className="flex h-10 shrink-0 items-end border-b border-[#303030] bg-[#171717] px-3">
              <div className="flex h-9 min-w-0 items-center gap-2 border-t-2 border-[#5ec9e8] bg-[#1e1e1e] px-3 font-mono text-[11px] text-[#e7e7e7]">
                <FileCode2 className="size-3.5 shrink-0 text-[#e8b563]" aria-hidden="true" />
                <span className="truncate">{project.id}.mapper.yaml</span>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-hidden bg-[#1e1e1e]">
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
                  height="100%"
                  language="yaml"
                  path={`${project.id}.mapper.yaml`}
                  theme="mapper-dark"
                  beforeMount={configureMapperMonaco}
                  onMount={handleEditorMount}
                  onChange={(value) => onChange(value ?? "")}
                  options={{
                    automaticLayout: true,
                    fixedOverflowWidgets: true,
                    fontFamily: "var(--font-plex-mono), Consolas, monospace",
                    fontSize: 13,
                    insertSpaces: true,
                    lineNumbers: "on",
                    minimap: { enabled: false },
                    overviewRulerLanes: 0,
                    renderLineHighlight: "all",
                    scrollBeyondLastLine: false,
                    scrollbar: { horizontal: "visible", useShadows: false, vertical: "visible" },
                    smoothScrolling: true,
                    tabSize: 2,
                    wordWrap: "off",
                  }}
                />
              )}
            </div>

            {error ? (
              <p role="alert" className="shrink-0 border-t border-[#6e2a2a] bg-[#2a1414] px-4 py-2 text-xs text-[#ffb4a8]">
                {error}
              </p>
            ) : null}

            <footer className="flex shrink-0 flex-col gap-3 border-t border-[#303030] bg-[#121212] p-3 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-3 font-mono text-[10px] text-[#bdbdbd]">
                <span className="rounded bg-[#007acc] px-2 py-1 text-white">Mapper YAML</span>
                <button type="button" className="underline-offset-2 hover:text-white hover:underline" onClick={() => setPlainEditor((value) => !value)}>
                  {plainEditor ? "Switch to Monaco" : "Switch to plain text"}
                </button>
                <span className="hidden sm:inline">Ctrl+Enter applies</span>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" className="text-[#d4d4d4] hover:bg-[#2a2d2e] hover:text-white" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button className="bg-[#e26d45] text-white hover:bg-[#f17d55]" onClick={applySource} disabled={pending}>
                  {pending ? "Applying..." : "Apply YAML"}
                </Button>
              </div>
            </footer>
          </section>
        </div>
      ) : null}
    </>
  );
}
