export type MapperIcon = {
  id: string;
  name: string;
  pack: "Carbon";
  svg: string;
};

export const builtinIcons: MapperIcon[] = [
  {
    id: "carbon-tree",
    name: "Tree",
    pack: "Carbon",
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="currentColor"><path d="M12,30H9V28h3V15.5664L8.4854,13.4575l1.0292-1.7148,3.5147,2.1084A2.0115,2.0115,0,0,1,14,15.5664V28A2.0023,2.0023,0,0,1,12,30Z"/><path d="M22,30H19a2.0024,2.0024,0,0,1-2-2V17h6a4.0008,4.0008,0,0,0,3.981-4.396A4.1489,4.1489,0,0,0,22.7853,9H21.2016L21.025,8.221C20.452,5.6961,18.0308,4,15,4A6.02,6.02,0,0,0,9.5585,7.4859L9.25,8.1531l-.863-.1143A2.771,2.771,0,0,0,8,8a4,4,0,1,0,0,8v2A6,6,0,1,1,8,6c.0264,0,.0525,0,.0786.001A8.0271,8.0271,0,0,1,15,2c3.6788,0,6.6923,1.9776,7.7516,5h.0337a6.1641,6.1641,0,0,1,6.1872,5.4141A6.0011,6.0011,0,0,1,23,19l-4,0v9h3Z"/></svg>',
  },
  {
    id: "carbon-campsite",
    name: "Campsite",
    pack: "Carbon",
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="currentColor"><path d="M27.5618,26,17.17,8.9277,19.5361,5.04,17.8281,4,16,7.0049,14.17,4l-1.708,1.04,2.3665,3.8877L4.438,26H2v2H30V26ZM16,10.8506,25.2207,26H17V18H15v8H6.7791Z"/></svg>',
  },
  {
    id: "carbon-mountain",
    name: "Mountain",
    pack: "Carbon",
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="currentColor"><path d="M27.6343,26,17.7888,5.1055a2,2,0,0,0-3.5879.021L4.3657,26H2v2H30V26ZM15.99,5.979,20.9473,16.5,19,17.7979l-3-2-3,2-1.9551-1.3033ZM10.1846,18.3247,13,20.2021l3-2,3,2,2.8091-1.873L25.4233,26H6.5752Z"/></svg>',
  },
  {
    id: "carbon-airport",
    name: "Airport",
    pack: "Carbon",
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="currentColor"><path fill-rule="evenodd" d="M17,14.5,23,17V15l-6-3V9a1,1,0,0,0-2,0v3L9,15v2l6-2.5V20l-3,2v1l4-1,4,1V22l-3-2Z"/><path d="M16,30A14,14,0,1,1,30,16,14.0158,14.0158,0,0,1,16,30ZM16,4A12,12,0,1,0,28,16,12.0137,12.0137,0,0,0,16,4Z"/></svg>',
  },
  {
    id: "carbon-restaurant",
    name: "Restaurant",
    pack: "Carbon",
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="currentColor"><path d="M9 2H11V12H9z"/><path d="M14,11a4,4,0,0,1-8,0V2H4v9a6,6,0,0,0,5,5.91V30h2V16.91A6,6,0,0,0,16,11V2H14Z"/><path d="M22,2H21V30h2V20h3a2,2,0,0,0,2-2V8A5.78,5.78,0,0,0,22,2Zm4,16H23V4.09c2.88.56,3,3.54,3,3.91Z"/></svg>',
  },
  {
    id: "carbon-hotel",
    name: "Hotel",
    pack: "Carbon",
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="currentColor"><path d="M9.5,15A1.5,1.5,0,1,1,8,16.5,1.5,1.5,0,0,1,9.5,15m0-2A3.5,3.5,0,1,0,13,16.5,3.5,3.5,0,0,0,9.5,13Z"/><path d="M25,14H17a2,2,0,0,0-2,2v6H4V10.6L16,4.14l12.53,6.74.94-1.76-13-7a1,1,0,0,0-.94,0l-13,7A1,1,0,0,0,2,10V30H4V24H28v6h2V19A5,5,0,0,0,25,14Zm-8,8V16h8a3,3,0,0,1,3,3v3Z"/></svg>',
  },
  {
    id: "carbon-car",
    name: "Car",
    pack: "Carbon",
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="currentColor"><path d="M26,16.5V14c0-.3-.2-.6-.5-.7l-3-1.2-1.6-3.2C20.7,8.4,20.1,8,19.5,8h-7c-.6,0-1.2.4-1.4.9l-1.6,3.2-3,1.2c-.3.1-.5.4-.5.7v2.5c-1.1.3-2,1.3-2,2.5v4c0,1.1.9,2,2,2h1c0,1.7,1.3,3,3,3s3-1.3,3-3h4c0,1.7,1.3,3,3,3s3-1.3,3-3h1c1.1,0,2-.9,2-2v-4C28,17.9,27.1,16.9,26,16.5z M10.5,13l1.5-3h8l1.5,3H10.5z M8,21c0-.6.4-1,1-1s1,.4,1,1s-.4,1-1,1S8,21.6,8,21z M24,21c0,.6-.4,1-1,1s-1-.4-1-1s.4-1,1-1S24,20.4,24,21z M26,19c0,.6-.4,1-1,1h-1.2c-.5-1.2-1.7-2-3-2s-2.5.8-3,2h-3.5c-.5-1.2-1.7-2-3-2s-2.5.8-3,2H7c-.6,0-1-.4-1-1v-2c0-.6.4-1,1-1h1v-1.5c0-.3.2-.6.5-.7l3.3-1.3L13.1,9c.1-.2.3-.3.5-.3h5c.2,0,.4.1.5.3l1.8,3.5l3.3,1.3c.3.1.5.4.5.7V16h1c.6,0,1,.4,1,1V19z"/></svg>',
  },
  {
    id: "carbon-train",
    name: "Train",
    pack: "Carbon",
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="currentColor"><path d="M22,2H10C8.3,2,7,3.3,7,5v16c0,1.7,1.3,3,3,3h1l-3,4v1h16v-1l-3-4h1c1.7,0,3-1.3,3-3V5C25,3.3,23.7,2,22,2z M23,21c0,.6-.4,1-1,1H10c-.6,0-1-.4-1-1V5c0-.6.4-1,1-1h12c.6,0,1,.4,1,1V21z M16,23c-1.1,0-2,.9-2,2s.9,2,2,2s2-.9,2-2S17.1,23,16,23z M11,11h10v4H11V11z M12,10l1-3h6l1,3H12z"/></svg>',
  },
  {
    id: "carbon-boat",
    name: "Boat",
    pack: "Carbon",
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="currentColor"><path d="M29.9,22.7l-3-13C26.7,9,26.4,8.5,26,8.2C25.7,8,25.3,8,25,8h-2V5c0-1.1-.9-2-2-2h-6c-1.1,0-2,.9-2,2v3h-2c-.3,0-.7,0-1,.2C7.6,8.5,7.3,9,7.1,9.7l-3,13C3.9,23.2,4,23.6,4.3,24c.3.4.7.6,1.1.6h1.7c.4,0,.8-.2,1.1-.6c.3-.4.7-.6,1.1-.6s.8.2,1.1.6c.3.4.7.6,1.1.6s.8-.2,1.1-.6c.3-.4.7-.6,1.1-.6s.8.2,1.1.6c.3.4.7.6,1.1.6s.8-.2,1.1-.6c.3-.4.7-.6,1.1-.6s.8.2,1.1.6c.3.4.7.6,1.1.6s.8-.2,1.1-.6c.3-.4.7-.6,1.1-.6s.8.2,1.1.6c.3.4.7.6,1.1.6H27c.4,0,.8-.2,1.1-.6C29.7,23.6,30.1,23.2,29.9,22.7z M15,5h2v3h-2V5z M9.8,10.3C9.9,10.1,10.2,10,10.4,10h11.2c.2,0,.5.1.6.3l2.5,7.7H7.3L9.8,10.3z M7,20c0-.6.4-1,1-1h16c.6,0,1,.4,1,1H7z"/></svg>',
  },
  {
    id: "carbon-walk",
    name: "Walk",
    pack: "Carbon",
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="currentColor"><path d="M19,7c1.1,0,2-.9,2-2s-.9-2-2-2s-2,.9-2,2S17.9,7,19,7z M24,12v-4h-4l-3.7-3.7c-.2-.2-.4-.3-.8-.3c-.3,0-.6.1-.8.3l-4.5,4.5c-.2.2-.3.4-.3.7v5.5h2v-4.8l3-3v7.8l-4.8,8.5l1.8,1l5-9h2l2.8,9l2.2-.5l-2.8-9H24z M24,15v2h3v2h-3v2h3v2h-5V15H24z"/></svg>',
  },
];

export function getIconSvg(
  iconId: string,
  customIcons: Array<{ id: string; svg: string }>,
) {
  return (
    builtinIcons.find((icon) => icon.id === iconId)?.svg ??
    customIcons.find((icon) => icon.id === iconId)?.svg ??
    null
  );
}

const legacyPointIcons: Record<string, string> = {
  city: "carbon-hotel",
  temple: "carbon-restaurant",
  mountain: "carbon-mountain",
  airport: "carbon-airport",
  lake: "carbon-tree",
  camp: "carbon-campsite",
  viewpoint: "carbon-mountain",
};

export function getPointIconSvg(
  iconId: string | undefined,
  customIcons: Array<{ id: string; svg: string }>,
) {
  if (!iconId) return null;
  if (customIcons.some((icon) => icon.id === iconId)) return getIconSvg(iconId, customIcons);
  return getIconSvg(legacyPointIcons[iconId] ?? iconId, customIcons);
}

export function sizeIconSvg(
  svg: string,
  dimensions: { width: number; height: number; x?: number; y?: number; color?: string },
) {
  return svg.replace(/<svg\b([^>]*)>/i, (_match, attributes: string) => {
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
