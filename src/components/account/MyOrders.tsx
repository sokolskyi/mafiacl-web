import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { money } from "@/lib/shop/queries";

type Status = "pending" | "paid" | "fulfilled" | "cancelled";

/** «Мои заказы» в кабинете: последние заказы магазина. Нет заказов — блока нет. */
export async function MyOrders({ locale, userId }: { locale: Locale; userId: string }) {
  const t = await getTranslations({ locale, namespace: "account" });
  const ts = await getTranslations({ locale, namespace: "shop" });
  const supabase = await createClient();
  // RLS: игрок видит только свои заказы.
  const { data, error } = await supabase
    .from("shop_orders")
    .select("id, status, total_czk, created_at")
    .eq("profile_id", userId)
    .order("created_at", { ascending: false })
    .limit(5);
  if (error) console.error("MyOrders failed", { code: error.code, message: error.message });
  if (!data || data.length === 0) return null;

  const date = new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Prague" });
  const statusClass: Record<Status, string> = {
    pending: "text-gold-300",
    paid: "text-green-300",
    fulfilled: "text-neutral-300",
    cancelled: "text-neutral-400",
  };

  return (
    <section aria-labelledby="my-orders-title" className="mt-8 max-w-xl">
      <h3 id="my-orders-title" className="text-lg font-bold">{t("myOrders")}</h3>
      <ul className="mt-3 divide-y divide-white/10 rounded border border-white/10">
        {data.map((o) => {
          const status = o.status as Status;
          return (
            <li key={o.id}>
              <Link
                href={{ pathname: "/shop/orders/[id]", params: { id: String(o.id) } }}
                className="flex min-h-11 flex-wrap items-baseline gap-x-4 gap-y-1 px-4 py-3 hover:bg-white/5"
              >
                <span className="font-semibold">{ts("order", { id: o.id })}</span>
                <span className="text-sm text-neutral-400">{date.format(new Date(o.created_at))}</span>
                <span className={`text-sm font-semibold ${statusClass[status]}`}>{ts(`status.${status}`)}</span>
                <span className="ml-auto font-bold">{money(locale, Number(o.total_czk))}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
