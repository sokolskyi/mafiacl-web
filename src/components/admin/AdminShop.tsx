import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getStaffContext } from "@/lib/admin/queries";
import { getAdminOrders, getAdminProducts, type AdminProduct } from "@/lib/admin/shop-queries";
import { markOrderPaid, saveProduct, setOrderStatus, setProductActive } from "@/lib/admin/shop-actions";
import { loc, money } from "@/lib/shop/queries";
import { PhotoField } from "./PhotoUpload";
import { variantText } from "@/components/shop/variant-label";

const input = "mt-1 w-full rounded border border-white/20 bg-neutral-900 px-3 py-2 outline-none focus:border-red-500";
const LANGS = ["cs", "ru", "uk", "en"] as const;

/** Читает сессию — только внутри <Suspense>. */
export async function AdminShop({ locale, saved, orderPaid, error }: { locale: Locale; saved?: boolean; orderPaid?: boolean; error?: string }) {
  await connection(); // админка всегда по запросу: дата, сессия
  const t = await getTranslations({ locale, namespace: "adminShop" });
  const ts = await getTranslations({ locale, namespace: "shop" });
  const ctx = await getStaffContext();
  if (!ctx) return <p className="mt-10"><Link href="/account" className="text-red-400 underline">{t("signIn")}</Link></p>;
  const clubs = ctx.clubs.filter((c) => c.roles.some((r) => r === "owner" || r === "admin" || r === "host"));
  if (clubs.length === 0) return <p className="mt-10 text-neutral-400">{t("noAccess")}</p>;

  return (
    <div className="mt-8 space-y-14">
      <p><Link href="/admin" className="text-sm text-neutral-300 underline">← {t("back")}</Link></p>
      {saved && <p role="status" className="text-green-400">{t("saved")}</p>}
      {orderPaid && <p role="status" className="text-green-400">{t("orderPaid")}</p>}
      {error && <p role="alert" className="text-red-400">{t(`errors.${error === "invalid" || error === "duplicate" || error === "schedule" ? error : "save"}`)}</p>}

      {await Promise.all(
        clubs.map(async (club) => {
          const canManage = club.roles.includes("owner") || club.roles.includes("admin");
          const [products, orders] = await Promise.all([canManage ? getAdminProducts(club.id) : Promise.resolve([]), getAdminOrders(club.id)]);
          return (
            <div key={club.id} className="space-y-14">
              <section>
                <h2 className="text-xl font-bold">{t("orders", { club: club.name })}</h2>
                <ul className="mt-4 divide-y divide-white/10 rounded border border-white/10">
                  {orders.map((o) => (
                    <li key={o.id} className="space-y-2 px-4 py-3">
                      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                        <span className="font-bold">#{o.id}</span>
                        <span className="font-semibold">{o.buyer}</span>
                        <span className="text-sm text-neutral-400">{new Intl.DateTimeFormat(locale, { timeZone: club.timezone, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(o.createdAt))}</span>
                        <span className="ml-auto font-bold">{money(locale, o.totalCzk)}</span>
                        <span className="rounded bg-white/10 px-2 py-0.5 text-xs">{t(`status.${o.status}`)}</span>
                      </div>
                      <p className="text-sm text-neutral-300">
                        {o.items
                          .map((i) => {
                            const extra = [i.label ? variantText(i.label, (k) => ts(k)) : "", i.color, i.nickname ? `${t("nick")}: ${i.nickname}` : ""].filter(Boolean).join(", ");
                            return `${loc(i.name, locale)}${extra ? ` (${extra})` : ""} × ${i.qty}`;
                          })
                          .join("; ")}
                      </p>
                      {o.status === "pending" && (
                        <div className="flex flex-wrap items-center gap-3">
                          <form action={markOrderPaid} className="flex items-center gap-2">
                            <input type="hidden" name="locale" value={locale} />
                            <input type="hidden" name="orderId" value={o.id} />
                            <select name="method" defaultValue="cash" aria-label={t("method")} className="rounded border border-white/20 bg-neutral-900 px-2 py-1 text-sm">
                              {(["cash", "card", "transfer"] as const).map((m) => <option key={m} value={m}>{t(`pay.${m}`)}</option>)}
                            </select>
                            <button className="rounded bg-red-600 px-3 py-1 text-sm font-semibold hover:bg-red-500">{t("markPaid")}</button>
                          </form>
                          <OrderButton locale={locale} id={o.id} status="cancelled" label={t("cancel")} />
                        </div>
                      )}
                      {o.status === "paid" && (
                        <div className="flex gap-3">
                          <OrderButton locale={locale} id={o.id} status="fulfilled" label={t("fulfil")} primary />
                          <OrderButton locale={locale} id={o.id} status="cancelled" label={t("cancel")} />
                        </div>
                      )}
                    </li>
                  ))}
                  {orders.length === 0 && <li className="px-4 py-3 text-neutral-500">{t("noOrders")}</li>}
                </ul>
              </section>

              {canManage && (
                <section>
                  <h2 className="text-xl font-bold">{t("products", { club: club.name })}</h2>
                  <p className="mt-1 max-w-2xl text-sm text-neutral-400">{t("productsHint")}</p>
                  <div className="mt-4 space-y-3">
                    {products.map((p) => (
                      <details key={p.id} className="rounded border border-white/10">
                        <summary className="flex cursor-pointer flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3">
                          <span className="flex-1 font-semibold">{loc(p.name, locale)}</span>
                          <span className="text-sm text-neutral-400">{p.kind === "membership" ? t("kindMembership") : t("kindMerch")}</span>
                          <span className="font-bold">{money(locale, p.priceCzk)}</span>
                          <span className={`rounded px-2 py-0.5 text-xs ${p.active ? "bg-green-500/20 text-green-300" : "bg-white/10 text-neutral-400"}`}>{p.active ? t("active") : t("hidden")}</span>
                        </summary>
                        <div className="border-t border-white/10 p-4">
                          <ProductForm t={t} locale={locale} clubId={club.id} product={p} />
                          <form action={setProductActive} className="mt-3">
                            <input type="hidden" name="locale" value={locale} />
                            <input type="hidden" name="productId" value={p.id} />
                            <input type="hidden" name="active" value={p.active ? "0" : "1"} />
                            <button className="text-sm text-neutral-400 underline hover:text-white">{p.active ? t("hide") : t("show")}</button>
                          </form>
                        </div>
                      </details>
                    ))}
                  </div>
                  <h3 className="mt-8 text-lg font-bold">{t("addProduct")}</h3>
                  <div className="mt-3 rounded border border-white/10 p-4">
                    <ProductForm t={t} locale={locale} clubId={club.id} />
                  </div>
                </section>
              )}
            </div>
          );
        }),
      )}
    </div>
  );
}

function OrderButton({ locale, id, status, label, primary }: { locale: Locale; id: number; status: "fulfilled" | "cancelled"; label: string; primary?: boolean }) {
  return (
    <form action={setOrderStatus}>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="orderId" value={id} />
      <input type="hidden" name="status" value={status} />
      <button className={primary ? "rounded bg-white/15 px-3 py-1 text-sm font-semibold hover:bg-white/25" : "text-sm text-neutral-400 underline hover:text-red-400"}>{label}</button>
    </form>
  );
}

type T = Awaited<ReturnType<typeof getTranslations>>;

const dmy = (iso: string | null) => (iso ? iso.split("-").reverse().join(".") : "");

function ProductForm({ t, locale, clubId, product }: { t: T; locale: Locale; clubId: number; product?: AdminProduct }) {
  const variantsText = product ? product.variants.filter((v) => v.label !== "").map((v) => `${v.label}${v.stock === null ? "" : ` = ${v.stock}`}`).join("\n") : "";
  const single = product?.variants.length === 1 && product.variants[0].label === "" ? product.variants[0].stock : null;
  return (
    <form action={saveProduct} className="grid max-w-3xl gap-3 sm:grid-cols-2">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="clubId" value={clubId} />
      {product && <input type="hidden" name="productId" value={product.id} />}
      {LANGS.map((l) => (
        <label key={`n${l}`} className="text-sm">{t("fields.name")} · {l.toUpperCase()}
          <input name={`name_${l}`} maxLength={80} required={l === "cs"} defaultValue={product?.name[l] ?? ""} className={input} />
        </label>
      ))}
      {LANGS.map((l) => (
        <label key={`d${l}`} className="text-sm">{t("fields.description")} · {l.toUpperCase()}
          <textarea name={`description_${l}`} rows={2} maxLength={600} defaultValue={product?.description?.[l] ?? ""} className={input} />
        </label>
      ))}
      <label className="text-sm">{t("fields.price")}
        <input name="price" type="number" min={0} step="1" required defaultValue={product?.priceCzk ?? ""} className={input} />
      </label>
      <label className="text-sm">{t("fields.sort")}
        <input name="sort" type="number" min={0} defaultValue={product?.sort ?? 100} className={input} />
      </label>
      <PhotoField
        clubId={clubId}
        initial={[product?.imageUrl, ...(product?.gallery ?? [])].filter((x): x is string => Boolean(x))}
        labels={{ label: t("fields.photos"), hint: t("fields.photosHint"), upload: t("fields.upload"), uploading: t("fields.uploading"), failed: t("fields.uploadFailed") }}
      />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="askNickname" defaultChecked={product?.askNickname ?? false} className="h-4 w-4" /> {t("fields.askNickname")}
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="askColor" defaultChecked={product?.askColor ?? false} className="h-4 w-4" /> {t("fields.askColor")}
      </label>
      {!product && (
        <>
          <label className="text-sm">{t("fields.kind")}
            <select name="kind" defaultValue="merch" className={input}>
              <option value="merch">{t("kindMerch")}</option>
              <option value="membership">{t("kindMembership")}</option>
            </select>
          </label>
          <label className="text-sm">{t("fields.plan")}
            <select name="plan" defaultValue="month" className={input}>
              {(["month", "quarter", "year"] as const).map((p) => <option key={p} value={p}>{t(`plans.${p}`)}</option>)}
            </select>
            <span className="mt-1 block text-xs text-neutral-500">{t("fields.planHint")}</span>
          </label>
        </>
      )}
      {product && (
        <>
          <label className="text-sm sm:col-span-2">{t("fields.schedule")}
            <textarea name="schedule" rows={4} defaultValue={product.schedule.map((r) => `${dmy(r.from)}–${dmy(r.until)} = ${r.priceCzk}`).join("\n")} placeholder={"–15.02.2027 = 9900\n16.02.2027–15.03.2027 = 10900"} className={`${input} font-mono`} />
            <span className="mt-1 block text-xs text-neutral-500">{t("fields.scheduleHint")}</span>
          </label>
          {product.kind === "membership" && product.plan === "year" && (
            <label className="text-sm">{t("fields.validUntil")}
              <input name="validUntil" inputMode="numeric" placeholder="31.12.2027" pattern="\d{2}\.\d{2}\.\d{4}" defaultValue={dmy(product.validUntil)} className={input} />
              <span className="mt-1 block text-xs text-neutral-500">{t("fields.validUntilHint")}</span>
            </label>
          )}
        </>
      )}
      {(!product || product.kind === "merch") && (
        <label className="text-sm sm:col-span-2">{t("fields.variants")}
          <textarea name="variants" rows={4} defaultValue={variantsText} placeholder={"S = 10\nM = 10\nL = 5"} className={`${input} font-mono`} />
          <span className="mt-1 block text-xs text-neutral-500">{t("fields.variantsHint")}{single !== null && ` (${t("fields.stockNow", { count: single })})`}</span>
        </label>
      )}
      {product && product.variants.some((v) => v.label !== "") && (
        <details className="rounded border border-white/10 p-3 text-sm sm:col-span-2">
          <summary className="cursor-pointer font-semibold">{t("fields.variantPhotos")}</summary>
          <p className="mt-1 text-xs text-neutral-500">{t("fields.variantPhotosHint")}</p>
          <div className="mt-3 grid gap-4">
            {product.variants
              .filter((v) => v.label !== "")
              .map((v) => (
                <PhotoField
                  key={v.id}
                  clubId={clubId}
                  name={`vimg_${v.id}`}
                  initial={v.images}
                  labels={{ label: v.label, hint: "", upload: t("fields.upload"), uploading: t("fields.uploading"), failed: t("fields.uploadFailed") }}
                />
              ))}
          </div>
        </details>
      )}
      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input type="checkbox" name="active" defaultChecked={product?.active ?? true} className="h-4 w-4" /> {t("fields.active")}
      </label>
      <button className="rounded bg-red-600 px-4 py-2 font-semibold hover:bg-red-500 sm:col-span-2">{product ? t("save") : t("add")}</button>
    </form>
  );
}
