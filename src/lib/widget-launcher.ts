export const LAUNCHER_POSITIONS = ["bottom-right", "bottom-left"] as const;
export const LAUNCHER_STYLES = ["pill", "vertical", "mascot"] as const;
export const DEFAULT_LAUNCHER_BOTTOM_OFFSET = 20;
export const DEFAULT_LAUNCHER_HORIZONTAL_OFFSET = 34;
export const DEFAULT_LAUNCHER_ANCHOR_GAP = 8;
export const MAX_LAUNCHER_BOTTOM_OFFSET = 240;
export const MAX_LAUNCHER_HORIZONTAL_OFFSET = 240;
export const MAX_LAUNCHER_ANCHOR_GAP = 80;
export const MAX_WIDGET_CUSTOM_CODE_LENGTH = 4000;
export const MIN_RESPONSIVE_LAUNCHER_OFFSET = 18;
export const RESPONSIVE_LAUNCHER_OFFSET_RATIO = 0.024;
export const WIDGET_LAUNCHER_FRAME_GUTTER = 24;

const ALLOWED_CUSTOM_CSS_SELECTORS = [
  ":root",
  ".lopuo-widget",
  ".lopuo-widget-launcher",
  ".lopuo-widget-panel",
  ".lopuo-widget-header",
  ".lopuo-widget-body",
  ".lopuo-widget-footer",
  ".lopuo-widget-close",
] as const;

const ALLOWED_CUSTOM_JS_HOOKS = ["onReady", "onOpen", "onClose", "onResize"] as const;
const ALLOWED_CUSTOM_JS_ACTIONS = ["track", "class", "data", "cssVar"] as const;

export type LauncherPosition = (typeof LAUNCHER_POSITIONS)[number];
export type LauncherStyle = (typeof LAUNCHER_STYLES)[number];

export const LAUNCHER_VISUAL_SIZES: Record<LauncherStyle, { width: number; height: number }> = {
  pill: { width: 244, height: 64 },
  vertical: { width: 64, height: 154 },
  mascot: { width: 52, height: 52 },
};

export function isLauncherPosition(value?: string | null): value is LauncherPosition {
  return LAUNCHER_POSITIONS.includes(value as LauncherPosition);
}

export function normalizeLauncherPosition(value?: string | null): LauncherPosition {
  return isLauncherPosition(value) ? value : "bottom-right";
}

export function normalizeLauncherBottomOffset(value?: number | string | null): number {
  return normalizeLauncherOffset(value, DEFAULT_LAUNCHER_BOTTOM_OFFSET, MAX_LAUNCHER_BOTTOM_OFFSET);
}

export function normalizeLauncherHorizontalOffset(value?: number | string | null): number {
  return normalizeLauncherOffset(value, DEFAULT_LAUNCHER_HORIZONTAL_OFFSET, MAX_LAUNCHER_HORIZONTAL_OFFSET);
}

export function normalizeLauncherAnchorGap(value?: number | string | null): number {
  return normalizeLauncherOffset(value, DEFAULT_LAUNCHER_ANCHOR_GAP, MAX_LAUNCHER_ANCHOR_GAP);
}

export function normalizeLauncherAnchorSelector(value?: string | null): string {
  const selector = String(value || "").trim().slice(0, 120);
  if (!selector) return "";
  if (!/^(?:[.#][A-Za-z0-9_-]{1,80}|\[data-[A-Za-z0-9_-]{1,64}(?:=[A-Za-z0-9_-]{1,64})?\])$/.test(selector)) {
    return "";
  }
  return selector;
}

export function normalizeLauncherStyle(value?: string | null): LauncherStyle {
  return LAUNCHER_STYLES.includes(value as LauncherStyle) ? (value as LauncherStyle) : "vertical";
}

export function resolveResponsiveLauncherOffset(value?: number | string | null, viewportWidth = 0): number {
  const offset = normalizeLauncherHorizontalOffset(value);
  if (offset <= 0 || offset <= MIN_RESPONSIVE_LAUNCHER_OFFSET || viewportWidth <= 0) {
    return offset;
  }

  const viewportOffset = Math.round(viewportWidth * RESPONSIVE_LAUNCHER_OFFSET_RATIO);
  return Math.min(offset, Math.max(MIN_RESPONSIVE_LAUNCHER_OFFSET, viewportOffset));
}

export function getLauncherFrameMetrics({
  launcherStyle,
  launcherPosition,
  launcherHorizontalOffset,
  launcherBottomOffset,
}: {
  launcherStyle?: string | null;
  launcherPosition?: string | null;
  launcherHorizontalOffset?: number | string | null;
  launcherBottomOffset?: number | string | null;
}) {
  const style = normalizeLauncherStyle(launcherStyle);
  const position = normalizeLauncherPosition(launcherPosition);
  const horizontalOffset = normalizeLauncherHorizontalOffset(launcherHorizontalOffset);
  const bottomOffset = normalizeLauncherBottomOffset(launcherBottomOffset);
  const frameHorizontalGutter = Math.min(WIDGET_LAUNCHER_FRAME_GUTTER, horizontalOffset);
  const frameBottomGutter = Math.min(WIDGET_LAUNCHER_FRAME_GUTTER, bottomOffset);
  const visualSize = LAUNCHER_VISUAL_SIZES[style];

  return {
    style,
    position,
    visualWidth: visualSize.width,
    visualHeight: visualSize.height,
    frameHorizontalGutter,
    frameBottomGutter,
    frameWidth: visualSize.width + frameHorizontalGutter * 2,
    frameHeight: visualSize.height + frameBottomGutter * 2,
    frameHorizontalOffset: Math.max(0, horizontalOffset - frameHorizontalGutter),
    frameBottomOffset: Math.max(0, bottomOffset - frameBottomGutter),
  };
}

export function normalizeWidgetCustomCss(value?: string | null): string {
  const input = truncateCustomCode(value);
  if (!input) return "";
  if (hasBlockedCssToken(input)) return "";

  const blocks = parseCustomCssBlocks(input);
  if (blocks.length > 0) {
    return blocks
      .map((block) => {
        const declarations = sanitizeCssDeclarations(block.body);
        return declarations ? `${block.selector} {\n${declarations}\n}` : "";
      })
      .filter(Boolean)
      .join("\n\n");
  }

  const declarations = sanitizeCssDeclarations(input);
  return declarations ? `.lopuo-widget {\n${declarations}\n}` : "";
}

export function normalizeWidgetCustomJs(value?: string | null): string {
  const input = truncateCustomCode(value);
  if (!input) return "";
  if (hasBlockedJsToken(input)) return "";

  const lines = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith("#") && !line.startsWith("//"));

  const normalizedLines = lines
    .map(normalizeCustomJsLine)
    .filter((line): line is string => Boolean(line));

  return normalizedLines.join("\n");
}

function normalizeLauncherOffset(value: number | string | null | undefined, fallback: number, max: number) {
  const parsed = typeof value === "number" ? value : Number.parseInt(String(value || ""), 10);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(max, Math.max(0, Math.round(parsed)));
}

function truncateCustomCode(value?: string | null) {
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .trim()
    .slice(0, MAX_WIDGET_CUSTOM_CODE_LENGTH);
}

function hasBlockedCssToken(value: string) {
  return /<\s*\/?\s*style\b/i.test(value) ||
    /@import\b/i.test(value) ||
    /expression\s*\(/i.test(value) ||
    /javascript\s*:/i.test(value);
}

function parseCustomCssBlocks(value: string) {
  const blockPattern = /([^{}]+)\{([^{}]*)\}/g;
  const blocks: Array<{ selector: string; body: string }> = [];

  for (const match of value.matchAll(blockPattern)) {
    const selector = normalizeCustomCssSelector(match[1] || "");
    if (selector) {
      blocks.push({ selector, body: match[2] || "" });
    }
  }

  return blocks;
}

function normalizeCustomCssSelector(value: string) {
  const selector = value.trim().replace(/\s+/g, " ");
  return ALLOWED_CUSTOM_CSS_SELECTORS.includes(selector as (typeof ALLOWED_CUSTOM_CSS_SELECTORS)[number])
    ? selector
    : "";
}

function sanitizeCssDeclarations(value: string) {
  return value
    .split(";")
    .map((declaration) => declaration.trim())
    .map(normalizeCssDeclaration)
    .filter((declaration): declaration is string => Boolean(declaration))
    .join("\n");
}

function normalizeCssDeclaration(declaration: string) {
  const separator = declaration.indexOf(":");
  if (separator <= 0) return "";

  const property = declaration.slice(0, separator).trim().toLowerCase();
  const value = declaration.slice(separator + 1).trim();
  if (!isAllowedCssProperty(property) || !isAllowedCssValue(value)) {
    return "";
  }

  return `  ${property}: ${value};`;
}

function isAllowedCssProperty(property: string) {
  return (
    /^--lopuo-[a-z0-9-]{1,48}$/.test(property) ||
    [
      "background",
      "background-color",
      "border",
      "border-color",
      "border-radius",
      "box-shadow",
      "color",
      "font-size",
      "font-weight",
      "height",
      "max-height",
      "max-width",
      "opacity",
      "outline",
      "padding",
      "transform",
      "width",
    ].includes(property)
  );
}

function isAllowedCssValue(value: string) {
  if (!value || value.length > 240) return false;
  if (/[{}<>]/.test(value)) return false;
  if (/url\s*\(/i.test(value) || /@import\b/i.test(value) || /javascript\s*:/i.test(value)) return false;
  return /^[#%(),.\-\w\s]+$/.test(value);
}

function hasBlockedJsToken(value: string) {
  return /<\s*\/?\s*script\b/i.test(value);
}

function normalizeCustomJsLine(line: string) {
  const match = line.match(/^(onReady|onOpen|onClose|onResize)\s*:\s*(track|class|data|cssVar)\s*=\s*([A-Za-z0-9_.:-]{1,80})$/);
  if (!match) return "";

  const hook = match[1] as (typeof ALLOWED_CUSTOM_JS_HOOKS)[number];
  const action = match[2] as (typeof ALLOWED_CUSTOM_JS_ACTIONS)[number];
  const value = match[3];

  if (!ALLOWED_CUSTOM_JS_HOOKS.includes(hook) || !ALLOWED_CUSTOM_JS_ACTIONS.includes(action)) {
    return "";
  }

  if (hasUnsafeCustomJsValue(value)) {
    return "";
  }

  return `${hook}: ${action}=${value}`;
}

function hasUnsafeCustomJsValue(value: string) {
  return /\b(?:eval|Function|fetch|XMLHttpRequest|WebSocket|import|document|window|localStorage|sessionStorage)\b/i.test(value) ||
    /(?:https?:\/\/|\/\/|javascript:)/i.test(value);
}
