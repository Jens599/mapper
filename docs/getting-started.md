# Getting Started

## Open the editor

Run `bun dev`, then open `http://localhost:3000`. Mapper opens the Alder Ridge
sample project so every major layer type has visible context.

## Understand the workspace

The top bar contains project, history, builder, export, theme, and help actions.
The left rail lists project objects in visual stacking order. The remaining area
is the conceptual plane.

On a narrow screen, use the menu button to open project objects in a bottom
sheet. Zoom controls stay over the lower-right corner of the plane.

## Select and hide objects

Choose an object by activating its name in the object rail. The selected row is
visually highlighted and marked with `aria-current` for assistive technology.
Use the switch at the end of a row to show or hide that object.

## Adjust the sample route

Select **Ridge trail**, then adjust:

- **Winding** changes perpendicular route displacement.
- **Noise scale** represents the distance between broad bends.
- **Domain warp** will control distortion of Perlin sample positions.

Every slider has a numeric input. Use the input for exact values or arrow-key
adjustment. Phase 1 uses a lightweight route preview; the seeded Perlin engine
replaces it in Phase 2.

## Navigate the plane

Use the visible minus and plus controls to change zoom. Activate the percentage
or target control to reset the view. Pointer panning, wheel zoom, and coordinate
editing arrive with the geometry editor while visible controls remain available
for keyboard and touch users.

## Choose travel presentation

Use the mode menu in the top bar to switch between **Travel map**, **Symbolic
travel**, and **Trail sketch**. Symbolic travel retains itinerary content but
auto-arranges stops on a clean diagram without a basemap or geographic accuracy.
Nearby stop labels alternate around their anchors in geographic mode to reduce
overlap. Mapper tries additional anchors and vertical offsets when labels still
collide; use a stop's label offset controls for final manual placement.

## Symbols and scatter

Open **Symbols** to choose a Carbon icon or import SVG files or a directory. Use
**Place center** for one editable symbol. Use **Create scatter** for one seeded
rule that can generate many symbols within the whole project, its top edge, or
around the selected stop, leg, waypoint, or route.

The randomizer stores its seed, count, minimum spacing, region, and scale and
rotation ranges in one YAML object. Generated symbols do not inflate the project
file. Geographic stops and symbols, symbolic stops and symbols, trail waypoints,
and trail icons can be dragged directly.

Travel terrain controls and trail project controls include separate line, text,
and symbol scales, so visual hierarchy can change without altering geometry.

## Theme

The theme button switches between light and dark survey palettes. The selection
is stored in the browser under `mapper-theme`.

## Local data

Projects autosave in IndexedDB and can be saved or opened as portable YAML files.
No project data is sent to a server.
