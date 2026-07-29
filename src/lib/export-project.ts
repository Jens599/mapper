import { toPng } from "html-to-image";

import { getIconSvg, getPointIconSvg, sizeIconSvg } from "@/lib/builtin-icons";
import { foregroundFromBackground } from "@/lib/color-utils";
import { generateTravelScatter } from "@/lib/scatter";
import type { MapperProject, TravelProject } from "@/lib/project-schema";
import { buildTravelLegsGeoJson, getWrappedLongitudeBounds } from "@/lib/travel-geometry";
import { downloadBlob, safeFilename } from "@/lib/project-io";

function escapeXml(value: string) {
  return value.replace(/[<>&"']/g, (character) => {
    const entities: Record<string, string> = {
      "<": "&lt;",
      ">": "&gt;",
      "&": "&amp;",
      '"': "&quot;",
      "'": "&apos;",
    };
    return entities[character];
  });
}

function buildTravelOverlaySvg(project: TravelProject) {
  const width = 1_200;
  const height = 800;
  const maxLabelOffset = Math.max(
    0,
    ...project.stops
      .filter((stop) => stop.visible)
      .flatMap((stop) => stop.labelOffset.map((value) => Math.abs(value))),
  );
  const padding = Math.min(400, 90 + maxLabelOffset);
  const scatterPlacements = project.scatter
    .filter((scatter) => scatter.visible)
    .flatMap((scatter) => generateTravelScatter(project, scatter));
  const data = buildTravelLegsGeoJson(project, null);
  const exportedCoordinates = [
    ...project.stops.map((stop) => stop.coordinates),
    ...data.features.flatMap((feature) => feature.geometry.coordinates),
    ...project.symbols.filter((symbol) => symbol.visible).map((symbol) => symbol.coordinates),
    ...scatterPlacements.map((placement) => placement.coordinates),
  ];
  const longitudes = exportedCoordinates.map((coordinates) => coordinates[0]);
  const latitudes = exportedCoordinates.map((coordinates) => coordinates[1]);
  const [minX, maxX] = getWrappedLongitudeBounds(longitudes);
  const minY = Math.min(...latitudes);
  const maxY = Math.max(...latitudes);
  const scaleX = (width - padding * 2) / Math.max(0.0001, maxX - minX);
  const scaleY = (height - padding * 2) / Math.max(0.0001, maxY - minY);
  const scale = Math.min(scaleX, scaleY);
  const projectPoint = ([rawLongitude, latitude]: number[]) => {
    let longitude = rawLongitude;
    while (longitude < minX) longitude += 360;
    while (longitude > minX + 360) longitude -= 360;
    return [
      padding + (longitude - minX) * scale,
      height - padding - (latitude - minY) * scale,
    ];
  };
  const routes = data.features
    .map((feature) => {
      const path = feature.geometry.coordinates
        .map((coordinate, index) => {
          const [x, y] = projectPoint(coordinate);
          return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
        })
        .join(" ");
      const dash = feature.properties.line === "dashed" ? ' stroke-dasharray="10 9"' : feature.properties.line === "dotted" ? ' stroke-dasharray="1 7"' : "";
      const arrowCoordinate = feature.geometry.coordinates[Math.max(0, feature.geometry.coordinates.length - 3)];
      const [arrowX, arrowY] = projectPoint(arrowCoordinate);
      const dayLabel = feature.properties.showDayLabel
        ? `<g transform="translate(${arrowX.toFixed(1)} ${arrowY.toFixed(1)})"><rect x="-25" y="-9" width="50" height="16" rx="8" fill="#f8faf8" stroke="${feature.properties.color}"/><text y="3" text-anchor="middle" font-family="monospace" font-size="8" font-weight="700" fill="${feature.properties.color}">${escapeXml(feature.properties.dayLabel)}</text></g>`
        : "";
      return `<path d="${path}" fill="none" stroke="${feature.properties.color}" stroke-width="${4 * project.presentation.lineScale}" stroke-linecap="round" marker-end="url(#travel-arrow)"${dash}/>${dayLabel}`;
    })
    .join("");
  const stops = project.stops
    .filter((stop) => stop.visible)
    .map((stop) => {
      const [x, y] = projectPoint(stop.coordinates);
      const anchor = stop.labelAnchor === "auto" ? "right" : stop.labelAnchor;
      const label = anchor === "top"
        ? { x: 0, nameY: -28, dayY: -14, align: "middle" }
        : anchor === "bottom"
          ? { x: 0, nameY: 30, dayY: 44, align: "middle" }
          : anchor === "left"
            ? { x: -16, nameY: -5, dayY: 13, align: "end" }
            : { x: 16, nameY: -5, dayY: 13, align: "start" };
      const ps = stop.pointStyle ?? {};
      const fill = ps.showFill === false ? "none" : ps.fill ?? "#f8faf8";
      const stroke = ps.showStroke === false ? "none" : ps.stroke ?? "#ad4a24";
      const sw = ps.strokeWidth ?? 2.5;
      const rawIconSvg = getPointIconSvg(stop.icon, project.iconAssets);
      const iconColor = ps.showFill === false ? ps.stroke ?? "#ad4a24" : foregroundFromBackground(fill);
      const iconSvg = rawIconSvg ? sizeIconSvg(rawIconSvg, { x: -9, y: -9, width: 18, height: 18, color: iconColor }) : "";
      return `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)})"><circle r="12" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>${iconSvg}<g transform="translate(${stop.labelOffset[0]} ${stop.labelOffset[1]})"><text x="${label.x}" y="${label.nameY}" text-anchor="${label.align}" font-family="sans-serif" font-size="${14 * project.presentation.textScale}" font-weight="700" fill="#18221d">${escapeXml(stop.name)}</text><text x="${label.x}" y="${label.dayY}" text-anchor="${label.align}" font-family="monospace" font-size="${10 * project.presentation.textScale}" font-weight="600" fill="#99401f">${escapeXml(stop.dayLabel)}</text></g></g>`;
    })
    .join("");
  const symbols = project.symbols
    .filter((symbol) => symbol.visible)
    .map((symbol) => {
      const svg = getIconSvg(symbol.iconId, project.iconAssets);
      if (!svg) return "";
      const [x, y] = projectPoint(symbol.coordinates);
      const sizedSvg = sizeIconSvg(svg, { x: -16, y: -16, width: 32, height: 32 });
      return `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${symbol.rotation}) scale(${symbol.scale * project.presentation.symbolScale})">${sizedSvg}</g>`;
    })
    .join("");
  const scatterSymbols = scatterPlacements
    .map((placement) => {
      const svg = getIconSvg(placement.iconId, project.iconAssets);
      if (!svg) return "";
      const [x, y] = projectPoint(placement.coordinates);
      const sizedSvg = sizeIconSvg(svg, { x: -16, y: -16, width: 32, height: 32 });
      return `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${placement.rotation}) scale(${placement.scale * project.presentation.symbolScale})">${sizedSvg}</g>`;
    })
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeXml(project.name)} travel itinerary"><defs><marker id="travel-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 10 5 0 10Z" fill="context-stroke"/></marker></defs><g>${routes}${scatterSymbols}${symbols}${stops}</g><text x="${padding}" y="40" font-family="sans-serif" font-size="24" font-weight="700" fill="#18221d">${escapeXml(project.name)}</text></svg>`;
}

function resolveSvgVariables(svg: SVGSVGElement) {
  const variables: Record<string, string> = {
    "--terrain": "#356c52",
    "--trail": "#ad4a24",
    "--card": "#f8faf8",
    "--foreground": "#18221d",
    "--muted": "#eef2ef",
    "--muted-foreground": "#5f6b63",
    "--canvas": "#e9efeb",
    "--canvas-bg": "#e9efeb",
    "--canvas-fg": "#18221d",
    "--canvas-muted": "#dce4df",
    "--water": "#216b8b",
  };
  const source = document.querySelector<HTMLElement>("[data-export-root]");
  if (source) {
    const style = getComputedStyle(source);
    for (const name of ["--canvas-bg", "--canvas-fg", "--canvas-muted"]) {
      const value = style.getPropertyValue(name).trim();
      if (value) variables[name] = value;
    }
  }
  const walker = document.createTreeWalker(svg, NodeFilter.SHOW_ELEMENT);
  let node: Element | null;
  while ((node = walker.nextNode() as Element | null) !== null) {
    for (const attr of Array.from(node.attributes)) {
      const resolved = attr.value
        .replace(/var\(--canvas-fg, var\(--foreground\)\)/g, variables["--canvas-fg"])
        .replace(/var\(--canvas-muted, var\(--muted\)\)/g, variables["--canvas-muted"])
        .replace(/var\(--canvas-fg, var\(--muted-foreground\)\)/g, variables["--canvas-fg"])
        .replace(/var\(--canvas-fg, var\(--trail\)\)/g, variables["--canvas-fg"])
        .replace(/var\((--[\w-]+)\)/g, (_, name) => variables[name] ?? attr.value);
      if (resolved !== attr.value) {
        node.setAttribute(attr.name, resolved);
      }
    }
  }
}

function serializeCanvasSvg(project: MapperProject, includeBackground: boolean) {
  const canvas = document.querySelector<SVGSVGElement>("[data-export-canvas]");
  if (!canvas) throw new Error("Canvas is not ready to export.");
  const root = document.querySelector<HTMLElement>("[data-export-root]");
  const clone = canvas.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.removeAttribute("class");
  clone.removeAttribute("style");
  clone.setAttribute("width", String(root?.clientWidth || 1000));
  clone.setAttribute("height", String(root?.clientHeight || 700));
  clone.querySelectorAll("[data-export-ignore]").forEach((node) => node.remove());
  resolveSvgVariables(clone);
  if (includeBackground) {
    const background = project.kind === "trail" ? project.canvas.background : project.map.background;
    const viewBox = clone.viewBox.baseVal;
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", String(viewBox.x));
    rect.setAttribute("y", String(viewBox.y));
    rect.setAttribute("width", String(viewBox.width || root?.clientWidth || 1000));
    rect.setAttribute("height", String(viewBox.height || root?.clientHeight || 700));
    rect.setAttribute("fill", background);
    clone.insertBefore(rect, clone.firstChild);
  }
  return new XMLSerializer().serializeToString(clone);
}

export function exportTransparentSvg(project: MapperProject) {
  let source: string;
  if (project.kind === "travel" && project.map.display === "geographic") {
    source = buildTravelOverlaySvg(project);
  } else {
    source = serializeCanvasSvg(project, false);
  }
  downloadBlob(
    new Blob([source], { type: "image/svg+xml;charset=utf-8" }),
    `${safeFilename(project.name)}-transparent.svg`,
  );
}

export async function exportSvgWithBackground(project: MapperProject) {
  if (project.kind !== "travel" || project.map.display !== "geographic") {
    const source = serializeCanvasSvg(project, true);
    downloadBlob(
      new Blob([source], { type: "image/svg+xml;charset=utf-8" }),
      `${safeFilename(project.name)}-map.svg`,
    );
    return;
  }
  const root = document.querySelector<HTMLElement>("[data-export-root]");
  if (!root) throw new Error("Canvas is not ready to export.");
  const image = await toPng(root, {
    pixelRatio: 2,
    cacheBust: true,
    filter: (node) => !(node instanceof Element && node.hasAttribute("data-export-ignore")),
  });
  const width = root.clientWidth * 2;
  const height = root.clientHeight * 2;
  const source = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#e9efeb"/><image href="${image}" width="${width}" height="${height}"/></svg>`;
  downloadBlob(
    new Blob([source], { type: "image/svg+xml;charset=utf-8" }),
    `${safeFilename(project.name)}-map.svg`,
  );
}

export async function exportPng(project: MapperProject) {
  const root = document.querySelector<HTMLElement>("[data-export-root]");
  if (!root) throw new Error("Canvas is not ready to export.");
  const dataUrl = await toPng(root, {
    pixelRatio: 2,
    cacheBust: true,
    backgroundColor: project.kind === "trail" ? project.canvas.background : project.map.background,
    filter: (node) => !(node instanceof Element && node.hasAttribute("data-export-ignore")),
  });
  const response = await fetch(dataUrl);
  downloadBlob(await response.blob(), `${safeFilename(project.name)}.png`);
}

export function exportCoordinatesCsv(project: MapperProject) {
  const quote = (value: string | number | undefined) =>
    `"${String(value ?? "").replaceAll('"', '""')}"`;
  const rows =
    project.kind === "travel"
      ? [
          ["id", "name", "longitude", "latitude", "day", "elevation"],
          ...project.stops.map((stop) => [
            stop.id,
            stop.name,
            stop.coordinates[0],
            stop.coordinates[1],
            stop.dayLabel,
            stop.elevation,
          ]),
        ]
      : [
          ["id", "name", "x", "y", "elevation", "units"],
          ...project.waypoints.map((point) => [
            point.id,
            point.name,
            point.x,
            point.y,
            point.elevation,
            project.units,
          ]),
        ];
  const source = rows.map((row) => row.map(quote).join(",")).join("\n");
  downloadBlob(
    new Blob([source], { type: "text/csv;charset=utf-8" }),
    `${safeFilename(project.name)}-coordinates.csv`,
  );
}
