"use client";

import { useEffect, useRef } from "react";

import { getProjectDatabase } from "@/lib/project-database";
import { projectSchema } from "@/lib/project-schema";
import { useEditorStore } from "@/store/editor-store";

export function useProjectAutosave() {
  const project = useEditorStore((state) => state.project);
  const replaceProject = useEditorStore((state) => state.replaceProject);
  const restored = useRef(false);
  const latestProject = useRef(project);
  latestProject.current = project;

  useEffect(() => {
    let cancelled = false;
    const initialKind = useEditorStore.getState().project.kind;
    getProjectDatabase()
      .projects.get(`active-${initialKind}`)
      .then((saved) => {
        if (cancelled || !saved) return;
        const result = projectSchema.safeParse(saved.project);
        if (result.success && result.data.kind === initialKind) {
          replaceProject(result.data);
        }
      })
      .catch(() => {
        // The editor remains usable when IndexedDB is unavailable.
      })
      .finally(() => {
        restored.current = true;
      });
    return () => {
      cancelled = true;
    };
  }, [replaceProject]);

  useEffect(() => {
    if (!restored.current) return;
    const save = () =>
      getProjectDatabase()
        .projects.put({
          id: `active-${project.kind}`,
          savedAt: Date.now(),
          project,
        })
        .catch(() => {
          // File save/load still works when browser persistence is denied.
        });
    const timeout = window.setTimeout(save, 500);
    return () => {
      window.clearTimeout(timeout);
    };
  }, [project]);

  useEffect(
    () => () => {
      if (!restored.current) return;
      const current = latestProject.current;
      void getProjectDatabase()
        .projects.put({
          id: `active-${current.kind}`,
          savedAt: Date.now(),
          project: current,
        })
        .catch(() => {
          // File save/load still works when browser persistence is denied.
        });
    },
    [],
  );
}
