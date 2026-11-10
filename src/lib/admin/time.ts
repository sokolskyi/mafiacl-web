/** Смещение часового пояса (мс) в момент `date`: местное − UTC. */
function tzOffset(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - date.getTime();
}

/** «2026-11-17T18:45» по времени города → ISO в UTC. Учитывает переход на летнее время. */
export function localInputToIso(value: string, timeZone: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!m) return null;
  const guess = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  let utc = guess - tzOffset(new Date(guess), timeZone);
  utc = guess - tzOffset(new Date(utc), timeZone);
  return new Date(utc).toISOString();
}

/** ISO → значение для <input type="datetime-local"> во времени города. */
export function isoToLocalInput(iso: string, timeZone: string) {
  const d = new Date(iso);
  const local = new Date(d.getTime() + tzOffset(d, timeZone));
  return local.toISOString().slice(0, 16);
}
