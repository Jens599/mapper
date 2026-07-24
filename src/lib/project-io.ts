import { parse, stringify } from "yaml";

import { parseProject, type MapperProject } from "@/lib/project-schema";

export function serializeProject(project: MapperProject) {
  return stringify(project, { indent: 2, lineWidth: 100 });
}

export function deserializeProject(source: string) {
  return parseProject(parse(source));
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function safeFilename(name: string) {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "mapper-project"
  );
}
