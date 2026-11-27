import { cacheLife } from "next/cache";

/**
 * Сегодняшняя дата в Праге (YYYY-MM-DD) для серверных компонентов.
 * `new Date()` прямо в рендере ломает пререндер (Cache Components: «unstable value»), а внутри кеша — можно:
 * значение живёт несколько минут, этого хватает для выбора текущего сезона или года.
 */
export async function pragueToday(): Promise<string> {
  "use cache";
  cacheLife("minutes");
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Prague" }).format(new Date());
}
