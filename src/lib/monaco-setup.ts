import type * as Monaco from "monaco-editor";
import { configureMonacoYaml, type MonacoYaml } from "monaco-yaml";

let yamlConfig: MonacoYaml | null = null;

export function configureMapperMonaco(monaco: typeof Monaco) {
  if (typeof window === "undefined") return;

  window.MonacoEnvironment = {
    getWorker(_moduleId, label) {
      if (label === "yaml") {
        return new Worker(new URL("monaco-yaml/yaml.worker", import.meta.url), { type: "module" });
      }
      return new Worker(new URL("monaco-editor/esm/vs/editor/editor.worker", import.meta.url), { type: "module" });
    },
  };

  monaco.editor.defineTheme("mapper-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "key", foreground: "9cdcfe" },
      { token: "string", foreground: "f0b7a4" },
      { token: "number", foreground: "b5d6a2" },
      { token: "keyword", foreground: "c7a0dc" },
    ],
    colors: {
      "editor.background": "#1e1e1e",
      "editor.foreground": "#d4d4d4",
      "editorLineNumber.foreground": "#858585",
      "editorLineNumber.activeForeground": "#c6c6c6",
      "editorCursor.foreground": "#aeafad",
      "editor.selectionBackground": "#264f78",
      "editor.lineHighlightBackground": "#2a2d2e",
      "editorGutter.background": "#1e1e1e",
    },
  });

  if (!monaco.languages.getLanguages().some((language) => language.id === "yaml")) {
    monaco.languages.register({ id: "yaml", extensions: [".yaml", ".yml"], aliases: ["YAML", "yaml"] });
  }

  monaco.languages.setMonarchTokensProvider("yaml", {
    tokenizer: {
      root: [
        [/^\s*[-?]?\s*([\w.-]+)(:)/, ["key", "delimiter"]],
        [/"(?:[^"\\]|\\.)*"/, "string"],
        [/'(?:[^'\\]|\\.)*'/, "string"],
        [/\b(?:true|false|null)\b/, "keyword"],
        [/-?\d+(?:\.\d+)?\b/, "number"],
        [/#.*$/, "comment"],
      ],
    },
  });

  yamlConfig ??= configureMonacoYaml(monaco, {
    completion: true,
    hover: true,
    validate: true,
    format: {},
    schemas: [
      {
        uri: "https://mapper.local/schema/project.json",
        fileMatch: ["**/*.mapper.yaml"],
        schema: mapperProjectSchema,
      },
    ],
  });
}

const mapperProjectSchema = {
  type: "object",
  required: ["version", "kind", "id", "name"],
  properties: {
    version: { const: 2 },
    kind: { enum: ["travel", "trail"] },
    id: { type: "string" },
    name: { type: "string" },
    durationDays: { type: "integer", minimum: 1 },
    subtitle: { type: "string" },
    presentation: {
      type: "object",
      properties: {
        lineScale: { type: "number", minimum: 0.25, maximum: 4 },
        textScale: { type: "number", minimum: 0.5, maximum: 3 },
        symbolScale: { type: "number", minimum: 0.25, maximum: 4 },
        arrowheadScale: { type: "number", minimum: 0.4, maximum: 2 },
        lineHaloColor: { type: "string", pattern: "^#[0-9a-fA-F]{6}$" },
        linePathColor: { type: "string", pattern: "^#[0-9a-fA-F]{6}$" },
        showArrowheads: { type: "boolean" },
        showModeIcons: { type: "boolean" },
        showLineHalo: { type: "boolean" },
        showLegend: { type: "boolean" },
        showTitleBlock: { type: "boolean" },
        showMapSilhouette: { type: "boolean" },
        showLeaderLines: { type: "boolean" },
        emphasizeEndpoints: { type: "boolean" },
        sequentialDayLabels: { type: "boolean" },
        extraArrowheads: { type: "boolean" },
        vividTransportColors: { type: "boolean" },
        fillCanvas: { type: "boolean" },
        largerDayText: { type: "boolean" },
        titlePosition: {
          type: "object",
          properties: { x: { type: "number" }, y: { type: "number" } },
        },
      },
    },
    map: {
      type: "object",
      properties: {
        display: { enum: ["geographic", "symbolic"] },
        style: { enum: ["positron", "liberty", "bright"] },
        background: { type: "string" },
      },
    },
    stops: { type: "array" },
    legs: { type: "array" },
    iconAssets: { type: "array" },
    symbols: { type: "array" },
    scatter: { type: "array" },
    boundaries: { type: "array" },
  },
};
