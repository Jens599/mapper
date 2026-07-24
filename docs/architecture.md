# Architecture

## Runtime boundary

Mapper is a client-side editor delivered by Next.js static export. Next.js
Server Components provide static route shells where useful, while interactive
editor modules form explicit Client Component boundaries. Browser APIs are only
accessed after hydration.

There is no application server. This keeps hosting portable and allows free
deployment to static hosts.

## Source layout

```text
src/
  app/                 Next.js routes, metadata, and global tokens
  components/editor/   Editor shell and domain-specific controls
  components/ui/       Owned, customized shadcn/ui source
  data/                 Versioned examples and fixtures
  lib/                  Validation and pure domain functions
  store/                Editor state and transactions
  test/                 Shared test setup
docs/                   User and engineering documentation
```

## Project model

`src/lib/project-schema.ts` is the runtime contract. Projects require a numeric
schema version and contain canvas settings plus a discriminated union of layers.
Cross-reference validation catches duplicate layer IDs, missing waypoint layers,
and route references to nonexistent waypoints.

Zod-inferred TypeScript types keep runtime validation and editor types aligned.
External YAML will be parsed into unknown data and accepted only after this
validation succeeds.

## State model

Zustand owns the current project, selection, viewport, and editor actions. Immer
keeps nested project updates concise without mutating state outside a transaction.

Generation output will remain derived from source parameters. It should not be
stored as an independently editable copy unless a user explicitly converts it to
geometry. This preserves reproducibility and makes undo transactions compact.

## Rendering model

Phase 1 uses semantic SVG for the visual fixture. React Konva will manage dense
interactive canvas marks in later phases. A parallel DOM object list, summaries,
and data tables remain the accessibility interface; hundreds of canvas marks
must not become individual tab stops.

## Static deployment

`next.config.ts` sets `output: "export"`. Production output contains HTML, CSS,
JavaScript, fonts, and static assets only. Features requiring cookies, Server
Actions, request-dependent route handlers, or server-side persistence are not
used.

## Testing strategy

- Vitest covers schemas, deterministic geometry, serialization, and stores.
- Testing Library covers semantic controls and keyboard behavior.
- Playwright covers complete editor, import, save, and export workflows.
- axe-core catches common accessibility regressions in representative states.
- Seeded fixtures compare geometry and export structures without fragile pixel
  snapshots where structural assertions are sufficient.
