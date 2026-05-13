const ADMIN_TIME_ZONE = "Asia/Shanghai";

export function formatAdminDateTime(
  value: Date | string,
  options: Intl.DateTimeFormatOptions = {},
) {
  const date = value instanceof Date ? value : new Date(value);

  return date.toLocaleString("zh-CN", {
    timeZone: ADMIN_TIME_ZONE,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    ...options,
  });
}

export function formatAdminShortDateTime(value: Date | string) {
  return formatAdminDateTime(value, {
    year: undefined,
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: undefined,
  });
}
