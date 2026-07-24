# Getting Started

## Open the editor

Run `bun dev`, then open `http://localhost:3000`. Mapper opens the Alder Ridge
sample project so every major layer type has visible context.

## Understand the workspace

The top bar contains project, history, builder, export, theme, and help actions.
The resizable left rail groups project objects into collapsible sections. Collapse
the complete rail to an icon strip when the canvas needs more room.

On a narrow screen, use the menu button to open project objects in a swipeable
bottom drawer. Selecting an object closes the drawer.

## Select and hide objects

Choose an object by activating its name in the object rail. The selected row is
visually highlighted and marked with `aria-current` for assistive technology.
Use the switch at the end of a row to show or hide that object.

## Adjust the sample route

Select **Ridge trail**, then adjust:

- **Winding** changes perpendicular route displacement.
- **Noise scale** represents the distance between broad bends.
- **Domain warp** will control distortion of Perlin sample positions.

Every slider has a numeric input. Travel legs also provide local seeded Perlin
amplitude, scale, octaves, and modulation. **Apply route shape to all legs** copies
those noise controls, curvature, and winding without replacing line color/style.

## Navigate the plane

Use the visible minus and plus controls to change zoom. Fit includes visible
routes, points, symbols, and scatter. Press `0` to fit or `+`/`-` to zoom. No map
also supports pointer panning and wheel zoom.

## Choose travel presentation

Use the mode menu in the top bar to switch between **Travel map**, **No map**,
and **Trail sketch**. No map retains itinerary content but
auto-arranges stops on a clean diagram without a basemap or geographic accuracy.
Nearby stop labels alternate around their anchors in geographic mode to reduce
overlap. Mapper tries additional anchors and vertical offsets when labels still
collide; use a stop's label offset controls for final manual placement.

Terrain context includes Positron, Liberty, and Bright OpenFreeMap styles backed
by OpenStreetMap data. The choice is stored under `map.style` in YAML.

## Symbols and scatter

Open **Symbols** to choose a Carbon icon or import SVG files or a directory. Use
**Place center** for one editable symbol. Use **Create scatter** for one seeded
rule that can generate many symbols within the whole project, its top edge, or
around the selected stop, leg, waypoint, or route.

The randomizer stores its seed, count, minimum spacing, region, and scale and
rotation ranges in one YAML object. Generated symbols do not inflate the project
file. Geographic stops and symbols, No map stops and symbols, trail waypoints,
and trail icons can be dragged directly.

Select a stop or waypoint to assign a Carbon or imported point symbol. Select a
travel leg to choose solid, dashed, or dotted rendering.

Travel terrain controls and trail project controls include separate line, text,
and symbol scales, so visual hierarchy can change without altering geometry.

## YAML Builder

Builder opens at half-screen width on desktop. Drag its left handle between 30%
and 80%, or use the header controls for half-screen and fullscreen modes. On
mobile it opens as a fullscreen drawer. YAML completion and validation remain
active in every layout.

## Theme

The theme button switches between light and dark survey palettes. The selection
is stored in the browser under `mapper-theme`.

## Local data

Projects autosave in IndexedDB and can be saved or opened as portable YAML files.
No project data is sent to a server.

Projects created by the old expanded scatter implementation are cleaned on load:
recognized sequential generated batches are discarded from travel symbols and
trail icons, while individual/manual placements remain. The next autosave or
YAML save emits compact data.
