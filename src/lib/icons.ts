import dynamicIconImports from "lucide-react/dynamicIconImports";

type IconNode = [tag: string, attrs: Record<string, string>][];

function iconNodeToSvg(name: string, node: IconNode): string {
  const children = node
    .map(([tag, attrs]) => {
      const attrStr = Object.entries(attrs)
        .map(([k, v]) => ` ${k}="${v}"`)
        .join("");
      return `<${tag}${attrStr}/>`;
    })
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${children}</svg>`;
}

const lucideImports = dynamicIconImports as Record<string, () => Promise<{ __iconNode?: IconNode }>>;

const svgCache = new Map<string, string>();
const enableLucideDynamic = true;

function sanitizeSvg(svg: string) {
  return svg
    .replace(/<script\b[\s\S]*?<\/script>/gi, "")
    .replace(/<foreignObject\b[\s\S]*?<\/foreignObject>/gi, "")
    .replace(/\s+on[a-z]+=(?:("[^"]*")|('[^']*')|[^\s>]+)/gi, "")
    .replace(/\s+(?:href|xlink:href)=(?:(['"])\s*(?:javascript|data):[\s\S]*?\1|[^\s>]*)/gi, "");
}

export async function loadLucideSvg(name: string): Promise<string | null> {
  if (!enableLucideDynamic) return null;
  if (svgCache.has(name)) return svgCache.get(name)!;
  const importer = lucideImports[name];
  if (!importer) return null;
  try {
    const mod = await importer();
    if (!mod.__iconNode) return null;
    const svg = sanitizeSvg(iconNodeToSvg(name, mod.__iconNode));
    svgCache.set(name, svg);
    return svg;
  } catch {
    return null;
  }
}

export function getCachedSvg(name: string): string | null {
  const svg = svgCache.get(name);
  return svg ? sanitizeSvg(svg) : null;
}

const iconAliases: Record<string, string> = {
  "carbon-tree": "tree-pine",
  "carbon-campsite": "tent",
  "carbon-mountain": "mountain",
  "carbon-airport": "plane",
  "carbon-restaurant": "utensils-crossed",
  "carbon-hotel": "hotel",
  "carbon-car": "car",
  "carbon-train": "train-front",
  "carbon-boat": "sailboat",
  "carbon-walk": "person-standing",
  "material-hotel": "hotel",
  "material-restaurant": "utensils-crossed",
  "material-flight": "plane",
  "material-train": "train-front",
  "material-directions-car": "car",
  "material-directions-boat": "sailboat",
  "material-pedestrian": "person-standing",
  "material-camping": "tent",
  "material-park": "tree-pine",
  "material-landscape": "mountain",
  "material-location-on": "map-pin",
  "material-flag": "flag",
  "material-info": "info",
  "material-settings": "settings",
  "material-menu": "menu",
  "material-search": "search",
  "material-favorite": "heart",
  "material-star": "star",
  "material-camera-alt": "camera",
  "material-wb-sunny": "sun",
  "material-dark-mode": "moon",
  "material-navigation": "compass",
  "material-directions": "signpost",
  "material-landmark": "landmark",
  "material-backpack": "backpack",
  "material-temple-buddhist": "tent",
  "material-museum": "landmark",
};

const legacyPointIcons: Record<string, string> = {
  city: "hotel",
  temple: "utensils-crossed",
  mountain: "mountain",
  airport: "plane",
  lake: "tree-pine",
  camp: "tent",
  viewpoint: "mountain",
};

const allLucideNames = Object.keys(lucideImports);

export function getIconSvg(
  iconId: string,
  customIcons: Array<{ id: string; svg: string }>,
): string | null {
  const custom = customIcons.find((icon) => icon.id === iconId);
  if (custom) return sanitizeSvg(custom.svg);
  const resolved = iconAliases[iconId] ?? legacyPointIcons[iconId] ?? iconId;
  return getCachedSvg(resolved);
}

export function getPointIconSvg(
  iconId: string | undefined,
  customIcons: Array<{ id: string; svg: string }>,
): string | null {
  if (!iconId) return null;
  const custom = customIcons.find((icon) => icon.id === iconId);
  if (custom) return sanitizeSvg(custom.svg);
  const resolved = legacyPointIcons[iconId] ?? iconId;
  return getCachedSvg(resolved);
}

export function sizeIconSvg(
  svg: string,
  dimensions: { width: number; height: number; x?: number; y?: number; color?: string },
) {
  const sanitized = sanitizeSvg(svg);
  const recolored = dimensions.color
    ? sanitized
        .replace(/\sstroke=(?:"(?!none\b)[^"]*"|'(?!none\b)[^']*'|(?!(?:none)\b)[^\s>]+)/gi, ' stroke="currentColor"')
        .replace(/\sfill=(?:"(?!none\b)[^"]*"|'(?!none\b)[^']*'|(?!(?:none)\b)[^\s>]+)/gi, ' fill="currentColor"')
    : sanitized;
  return recolored.replace(/<svg\b([^>]*)>/i, (_match, attributes: string) => {
    const selfClosing = attributes.trimEnd().endsWith("/");
    const cleaned = attributes
      .replace(/\/\s*$/, "")
      .replace(
        /\s(?:x|y|width|height|color)=(?:"[^"]*"|'[^']*'|[^\s>]+)/gi,
        "",
      );
    const position = `${dimensions.x === undefined ? "" : ` x="${dimensions.x}"`}${dimensions.y === undefined ? "" : ` y="${dimensions.y}"`}`;
    const color = dimensions.color ? ` color="${dimensions.color}"` : "";
    return `<svg${cleaned}${position} width="${dimensions.width}" height="${dimensions.height}"${color}${selfClosing ? " />" : ">"}`;
  });
}

export function getIconIds(): string[] {
  if (!enableLucideDynamic) return [...Object.keys(iconAliases), ...Object.keys(legacyPointIcons)];
  const names = new Set<string>();
  for (const name of allLucideNames) names.add(name);
  for (const v of Object.values(iconAliases)) if (names.has(v)) names.add(v);
  for (const k of Object.keys(iconAliases)) names.add(k);
  for (const v of Object.values(legacyPointIcons)) if (names.has(v)) names.add(v);
  for (const k of Object.keys(legacyPointIcons)) names.add(k);
  return [...names];
}

export const iconPack = "Lucide";

export const preloadIcons = (() => {
  const s = new Set([
    ...Object.values(iconAliases),
    ...Object.values(legacyPointIcons),
    "map-pin", "compass", "landmark", "route", "flag", "binoculars",
    "backpack", "sun", "moon", "star", "cloud-sun", "mountain-snow",
    "anchor", "trophy", "camera", "heart", "eye", "info",
    "settings", "menu", "search", "signpost", "trees", "leaf", "flame",
    "sunrise", "sunset", "cloud-drizzle", "cloud-lightning", "cloud-snow",
    "arrow-right", "arrow-left", "arrow-up", "arrow-down", "clock",
    "message-circle", "sailboat", "ship",
  ]);
  return [...s];
})();

let loadingPromise: Promise<void> | null = null;

export function preloadIconsAsync(): Promise<void> {
  if (!enableLucideDynamic) return Promise.resolve();
  if (!loadingPromise) {
    loadingPromise = Promise.all(
      preloadIcons.map((name) => loadLucideSvg(name))
    ).then(() => {});
  }
  return loadingPromise;
}

export const iconNames = preloadIcons;
