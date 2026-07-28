# Lucide Icon Picker Design

## Goal

Replace the curated icon-only selectors with one reusable searchable picker that can access every Lucide icon exposed by `lucide-react/dynamicIconImports`, while preserving imported SVG support.

## Scope

The picker will replace all current icon selectors:

- Symbol library sheet icon grid.
- Travel stop point symbol selector.
- Travel leg symbol override selector.
- Trail waypoint point symbol selector.

It will not add new npm icon packs or auto-discover arbitrary installed packages.

## Component Design

Create a shared `IconPicker` component under `src/components/editor/`. It will render a shadcn/Radix dropdown-style popover with:

- A trigger showing the selected icon preview, display name, and pack.
- A search input at the top.
- A scrollable result list/grid.
- Imported project SVGs included alongside Lucide results.
- Optional `None` item for nullable fields such as leg icon override.

The picker accepts `value`, `onValueChange`, `customIcons`, and an optional `allowNone` flag.

## Icon Loading

`src/lib/icons.ts` already exposes `getIconIds()` and `loadLucideSvg()`. The picker will use `getIconIds()` for the full Lucide ID list and lazily call `loadLucideSvg()` for the currently visible/search-matched result window.

This avoids preloading every Lucide SVG and keeps the initial UI responsive. Existing aliases and imported SVG behavior remain supported by `getIconSvg()`.

## Search

Search will use a small local fuzzy matcher, not a new dependency. Matching will consider:

- Icon ID, such as `mountain-snow`.
- Display name, such as `Mountain Snow`.
- Compact initials/characters, so queries like `mtn` can match `mountain`.

Results will be capped to a reasonable window, around 80 items, to avoid rendering the full Lucide set at once.

## Symbol Library

The Symbol library sheet will replace the current fixed grid with `IconPicker`. The sheet keeps SVG import, folder import, place, and scatter controls unchanged.

## Compatibility

Existing project data remains valid because icon IDs are unchanged. `carbon-*`, `material-*`, legacy IDs, imported SVG IDs, and native Lucide IDs still resolve through the existing icon helpers.

## Verification

- Run `npm run typecheck`.
- Smoke-test selecting a Lucide icon in each picker location.
- Smoke-test imported SVG selection.
- Confirm a non-preloaded Lucide ID can be searched, selected, and rendered.
