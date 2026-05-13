export const WIDGET_LOGO_TYPES = ["image", "text"] as const;
export const DEFAULT_WIDGET_LOGO_TYPE = "image";
export const DEFAULT_WIDGET_LOGO_URL = "https://www.lopuo.com/wp-content/themes/lopuo-theme/assets/img/lopuo-logo-black.svg?ver=0.8.14";
export const DEFAULT_WIDGET_LOGO_TEXT = "Lopuo";

export type WidgetLogoType = (typeof WIDGET_LOGO_TYPES)[number];

export function isWidgetLogoType(value?: string | null): value is WidgetLogoType {
  return WIDGET_LOGO_TYPES.includes(value as WidgetLogoType);
}

export function normalizeWidgetLogoType(value?: string | null): WidgetLogoType {
  return isWidgetLogoType(value) ? value : DEFAULT_WIDGET_LOGO_TYPE;
}

export function normalizeWidgetLogoText(value?: string | null) {
  return (value || "").trim().slice(0, 40) || DEFAULT_WIDGET_LOGO_TEXT;
}
