"use client";

import { yaml } from "@codemirror/lang-yaml";
import dynamic from "next/dynamic";
import { useEffect, useState, useTransition } from "react";

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

export function ProjectBuilder({ children }: { children: React.ReactNode }) {
  const project = useEditorStore((state) => state.project);
  const replaceProject = useEditorStore((state) => state.replaceProject);
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState(() => serializeProject(project));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

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
        <div className="min-h-0 flex-1 overflow-auto bg-[#111814]">
          <CodeMirror
            value={source}
            height="calc(100dvh - 10rem)"
            theme="dark"
            extensions={[yaml()]}
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
