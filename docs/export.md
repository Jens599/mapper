# Export Contract

Mapper treats export as a reproducible rendering operation rather than a browser
screenshot. All modes use the same selected layers, bounds, padding, styles, and
font decisions.

## Bounds

The user can export the full canvas, visible viewport, current selection, or a
custom frame. The export dialog previews the exact bounds and reports dimensions
before downloading.

Strokes, labels, rotated icons, and optional shadows must be included in bounds
calculations so output is not clipped.

## Transparent SVG

- Emit no background rectangle and no root background style.
- Preserve routes, contours, icons, labels, and enabled grid content as vectors.
- Set `viewBox` to the resolved bounds including user padding.
- Sanitize imported SVG content before including it.
- Include conceptual-terrain metadata without adding visible marks.

## SVG with background

- Render a bounds-sized background rectangle as the first visible element.
- Use the canvas color or a user-selected solid color.
- Include the grid only when **Export grid** is enabled.
- Keep all remaining content equivalent to transparent SVG.

## PNG

- Rasterize at 1x, 2x, 3x, or a custom scale.
- Support transparent and solid backgrounds.
- Report final pixel width and height before download.
- Preserve sharp output on high-density displays without changing project units.

## Structural acceptance checks

- Transparent SVG contains no bounds-sized background element.
- Background SVG begins with the expected background rectangle.
- Both SVG modes have identical content bounds and layer ordering.
- PNG dimensions match the previewed dimensions and scale.
- Hidden layers never appear in output.
- Text and icon transforms are retained.
- Exporting does not alter project state or undo history.
