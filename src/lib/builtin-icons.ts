import { getIconIds, getIconSvg as _getIconSvg, getPointIconSvg as _getPointIconSvg, sizeIconSvg as _sizeIconSvg, iconNames, iconPack } from "@/lib/icons";

export type MapperIcon = {
  id: string;
  name: string;
  pack: string;
  svg: string;
};

export const builtinIcons: MapperIcon[] = iconNames.map((name) => {
  const id = name;
  const displayName = name
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
  return {
    get id() { return id; },
    get name() { return displayName; },
    get pack() { return "Lucide"; },
    get svg() { return _getIconSvg(id, []) ?? ""; },
  };
});

export function getIconSvg(
  iconId: string,
  customIcons: Array<{ id: string; svg: string }>,
): string | null {
  return _getIconSvg(iconId, customIcons);
}

export function getPointIconSvg(
  iconId: string | undefined,
  customIcons: Array<{ id: string; svg: string }>,
): string | null {
  return _getPointIconSvg(iconId, customIcons);
}

export function sizeIconSvg(
  svg: string,
  dimensions: { width: number; height: number; x?: number; y?: number; color?: string },
) {
  return _sizeIconSvg(svg, dimensions);
}
