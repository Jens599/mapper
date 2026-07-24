import Dexie, { type EntityTable } from "dexie";

import type { MapperProject } from "@/lib/project-schema";

type SavedProject = {
  id: string;
  savedAt: number;
  project: MapperProject;
};

type MapperDatabase = Dexie & {
  projects: EntityTable<SavedProject, "id">;
};

let database: MapperDatabase | null = null;

export function getProjectDatabase() {
  if (!database) {
    database = new Dexie("mapper-projects") as MapperDatabase;
    database.version(1).stores({ projects: "id, savedAt" });
  }
  return database;
}
