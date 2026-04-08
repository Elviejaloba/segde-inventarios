type ParsedSyncDate = {
  date: Date;
  hasTime: boolean;
};

function parseSyncDate(raw: string | null | undefined): ParsedSyncDate | null {
  if (!raw) return null;
  const value = raw.trim();
  if (!value) return null;

  // First try native parsing (handles ISO formats like 2026-04-08T17:14:15.794Z).
  const nativeDate = new Date(value);
  if (!Number.isNaN(nativeDate.getTime())) {
    return {
      date: nativeDate,
      hasTime: /T\d{2}:\d{2}/.test(value) || /\s\d{2}:\d{2}/.test(value),
    };
  }

  // Backward-compatible fallback for plain local strings (YYYY-MM-DD or YYYY-MM-DD HH:mm).
  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$/,
  );
  if (!match) return null;

  const [, y, m, d, hh, mm, ss] = match;
  const date = new Date(
    Number(y),
    Number(m) - 1,
    Number(d),
    Number(hh ?? "0"),
    Number(mm ?? "0"),
    Number(ss ?? "0"),
  );

  if (Number.isNaN(date.getTime())) return null;
  return { date, hasTime: Boolean(hh && mm) };
}

export function getLatestSyncLabel(
  costosFecha: string | null | undefined,
  ventasFecha: string | null | undefined,
): string {
  const costo = parseSyncDate(costosFecha);
  const venta = parseSyncDate(ventasFecha);
  const latest = costo && venta ? (costo.date > venta.date ? costo : venta) : costo || venta;

  if (!latest) return "Sin datos";

  const d = latest.date;
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = String(d.getFullYear()).slice(2);
  const time = latest.hasTime
    ? ` ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
    : "";

  return `${day}/${month}/${year}${time}`;
}

