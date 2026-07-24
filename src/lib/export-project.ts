import { toPng } from "html-to-image";

import type { MapperProject, TravelProject } from "@/lib/project-schema";
import { buildTravelLegsGeoJson } from "@/lib/travel-geometry";
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
  const padding = 90;
  const longitudes = project.stops.map((stop) => stop.coordinates[0]);
  const latitudes = project.stops.map((stop) => stop.coordinates[1]);
  const minX = Math.min(...longitudes);
  const maxX = Math.max(...longitudes);
  const minY = Math.min(...latitudes);
  const maxY = Math.max(...latitudes);
  const scaleX = (width - padding * 2) / Math.max(0.0001, maxX - minX);
  const scaleY = (height - padding * 2) / Math.max(0.0001, maxY - minY);
  const scale = Math.min(scaleX, scaleY);
  const projectPoint = ([longitude, latitude]: number[]) => [
    padding + (longitude - minX) * scale,
    height - padding - (latitude - minY) * scale,
  ];
  const data = buildTravelLegsGeoJson(project, null);
  const routes = data.features
    .map((feature) => {
      const path = feature.geometry.coordinates
        .map((coordinate, index) => {
          const [x, y] = projectPoint(coordinate);
          return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
        })
        .join(" ");
      const dash = feature.properties.line === "dashed" ? ' stroke-dasharray="10 9"' : "";
      return `<path d="${path}" fill="none" stroke="${feature.properties.color}" stroke-width="4" stroke-linecap="round"${dash}/>`;
    })
    .join("");
  const stops = project.stops
    .filter((stop) => stop.visible)
    .map((stop) => {
      const [x, y] = projectPoint(stop.coordinates);
      return `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)})"><circle r="7" fill="#ad4a24" stroke="#fff" stroke-width="3"/><text x="12" y="-5" font-family="sans-serif" font-size="14" font-weight="700" fill="#18221d">${escapeXml(stop.name)}</text><text x="12" y="13" font-family="monospace" font-size="10" font-weight="600" fill="#99401f">${escapeXml(stop.dayLabel)}</text></g>`;
    })
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeXml(project.name)} travel itinerary"><g>${routes}${stops}</g><text x="${padding}" y="40" font-family="sans-serif" font-size="24" font-weight="700" fill="#18221d">${escapeXml(project.name)}</text></svg>`;
}

export function exportTransparentSvg(project: MapperProject) {
  let source: string;
  if (project.kind === "travel") {
    source = buildTravelOverlaySvg(project);
  } else {
    const canvas = document.querySelector<SVGSVGElement>("[data-export-canvas]");
    if (!canvas) throw new Error("Trail canvas is not ready to export.");
    const clone = canvas.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clone.removeAttribute("class");
    const style = document.createElementNS("http://www.w3.org/2000/svg", "style");
    style.textContent = `:root{--terrain:#356c52;--trail:#ad4a24;--card:#f8faf8;--foreground:#18221d;--canvas:#e9efeb;--water:#216b8b}`;
    clone.prepend(style);
    source = new XMLSerializer().serializeToString(clone);
  }
  downloadBlob(
    new Blob([source], { type: "image/svg+xml;charset=utf-8" }),
    `${safeFilename(project.name)}-transparent.svg`,
  );
}

export async function exportSvgWithBackground(project: MapperProject) {
  const root = document.querySelector<HTMLElement>("[data-export-root]");
  if (!root) throw new Error("Canvas is not ready to export.");
  const image = await toPng(root, { pixelRatio: 2, cacheBust: true });
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
    backgroundColor: project.kind === "trail" ? project.canvas.background : "#e9efeb",
  });
  const response = await fetch(dataUrl);
  downloadBlob(await response.blob(), `${safeFilename(project.name)}.png`);
}
