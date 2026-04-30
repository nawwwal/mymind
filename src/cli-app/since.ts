/** Parse durations like 7d, 12h, 2w, 3mo → cutoff epoch ms (UTC). */
export function parseSinceCutoffMs(since: string): number | null {
  const m = /^(\d+)(h|d|w|mo)$/i.exec(since.trim());
  if (!m) return null;
  const n = Number(m[1]);
  const unit = m[2]?.toLowerCase();
  const now = Date.now();
  const msHour = 3600_000;
  if (unit === "h") return now - n * msHour;
  if (unit === "d") return now - n * 24 * msHour;
  if (unit === "w") return now - n * 7 * 24 * msHour;
  if (unit === "mo") return now - n * 30 * 24 * msHour;
  return null;
}

export function filterObjectsBySince(data: unknown, sinceMs: number): { filtered: unknown; dropped: number } {
  if (!Array.isArray(data)) return { filtered: data, dropped: 0 };
  let dropped = 0;
  const filtered = data.filter((item) => {
    if (item && typeof item === "object" && "created" in item && typeof item.created === "string") {
      const t = Date.parse(item.created);
      if (Number.isFinite(t) && t >= sinceMs) return true;
      dropped++;
      return false;
    }
    return true;
  });
  return { filtered, dropped };
}
