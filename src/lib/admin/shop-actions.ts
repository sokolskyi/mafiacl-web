"use server";

import { redirect } from "next/navigation";
import { updateTag } from "next/cache";
import { getPathname } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";
import { SHOP_TAG } from "@/lib/shop/queries";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStaffContext } from "@/lib/admin/queries";

// Действия идут от имени вошедшего сотрудника: права (владелец/админ — товары,
// владелец/админ/ведущий — заказы) проверяет RLS в базе.

const LOCALES = ["cs", "ru", "uk", "en"] as const;
const PLANS = ["month", "quarter", "year"] as const;
const PAY_METHODS = ["cash", "card", "transfer"] as const;

function toLocale(value: FormDataEntryValue | null): Locale {
  const v = String(value ?? "");
  return (routing.locales as readonly string[]).includes(v) ? (v as Locale) : routing.defaultLocale;
}
const back = (locale: Locale, flag?: string) => {
  const base = getPathname({ href: "/admin/shop", locale });
  return flag ? `${base}?${flag}` : base;
};
function slugify(s: string) {
  const base = s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return /^[a-z0-9][a-z0-9-]+$/.test(base) ? base : `item-${Date.now().toString(36)}`;
}
function localized(formData: FormData, prefix: string) {
  const out: Record<string, string> = {};
  for (const l of LOCALES) {
    const v = String(formData.get(`${prefix}_${l}`) ?? "").trim().slice(0, prefix === "name" ? 80 : 600);
    if (v) out[l] = v;
  }
  return out;
}
const LOCAL_IMAGE = /^\/[a-z0-9][a-z0-9/_.-]*\.(webp|jpg|jpeg|png|avif)$/;
function imageRef(v: string) {
  if (LOCAL_IMAGE.test(v)) return v;
  try {
    const u = new URL(v);
    return u.protocol === "https:" ? u.toString() : undefined;
  } catch {
    return undefined;
  }
}
/** Фото: по ссылке на строку, первая — главная. undefined — есть неверная ссылка. */
function imageList(value: FormDataEntryValue | null) {
  const lines = String(value ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  const out: string[] = [];
  for (const l of lines) {
    const r = imageRef(l);
    if (!r) return undefined;
    if (!out.includes(r)) out.push(r);
  }
  return out.slice(0, 13);
}
/** «M = 5» — по строке на вариант; без числа — остаток не считаем. */
function parseVariants(raw: string) {
  const out: { label: string; stock: number | null }[] = [];
  for (const line of raw.split("\n")) {
    const text = line.trim();
    if (!text) continue;
    const [labelRaw, stockRaw] = text.split("=").map((s) => s.trim());
    const label = (labelRaw ?? "").slice(0, 40);
    const stock = stockRaw === undefined || stockRaw === "" ? null : Number(stockRaw);
    if (stock !== null && (!Number.isInteger(stock) || stock < 0 || stock > 100000)) return null;
    if (out.some((v) => v.label === label)) return null;
    out.push({ label, stock });
  }
  return out.slice(0, 30);
}

async function syncVariants(productId: number, variants: { label: string; stock: number | null }[]) {
  const supabase = await createClient();
  const { data: existing } = await supabase.from("shop_variants").select("id, label").eq("product_id", productId);
  const byLabel = new Map((existing ?? []).map((v) => [v.label, v.id]));
  let ok = true;
  for (const [i, v] of variants.entries()) {
    const id = byLabel.get(v.label);
    const res = id
      ? await supabase.from("shop_variants").update({ stock: v.stock, sort: (i + 1) * 10 }).eq("id", id)
      : await supabase.from("shop_variants").insert({ product_id: productId, label: v.label, stock: v.stock, sort: (i + 1) * 10 });
    if (res.error) {
      console.error("syncVariants failed", { productId, code: res.error.code, message: res.error.message });
      ok = false;
    }
  }
  // Убранные из списка варианты не удаляем (старые заказы на них ссылаются) — обнуляем остаток.
  const keep = new Set(variants.map((v) => v.label));
  for (const [label, id] of byLabel) {
    if (!keep.has(label)) await supabase.from("shop_variants").update({ stock: 0 }).eq("id", id);
  }
  return ok;
}

const DMY = /^(\d{2})\.(\d{2})\.(\d{4})$/;
function isoDate(dmy: string | undefined) {
  if (!dmy) return null;
  const m = DMY.exec(dmy);
  if (!m) return undefined;
  const iso = `${m[3]}-${m[2]}-${m[1]}`;
  const d = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== iso ? undefined : iso;
}

/** «16.02.2027–15.03.2027 = 10900», начало или конец можно не писать. null — ошибка в строке. */
function parseSchedule(text: string) {
  const rows: { from: string | null; until: string | null; price: number }[] = [];
  for (const line of text.split("\n").map((l) => l.trim()).filter(Boolean)) {
    const m = /^(\d{2}\.\d{2}\.\d{4})?\s*[–—-]\s*(\d{2}\.\d{2}\.\d{4})?\s*=\s*(\d{1,7})$/.exec(line);
    if (!m) return null;
    const from = isoDate(m[1]);
    const until = isoDate(m[2]);
    if (from === undefined || until === undefined || (from && until && from > until)) return null;
    rows.push({ from, until, price: Number(m[3]) });
  }
  return rows.length > 24 ? null : rows;
}

export async function saveProduct(formData: FormData) {
  const locale = toLocale(formData.get("locale"));
  const idRaw = String(formData.get("productId") ?? "");
  const id = idRaw ? Number(idRaw) : null;
  const clubId = Number(formData.get("clubId"));
  const name = localized(formData, "name");
  const description = localized(formData, "description");
  const price = Number(String(formData.get("price") ?? "").replace(",", "."));
  const images = imageList(formData.get("images"));
  const askNickname = formData.get("askNickname") === "on";
  const askColor = formData.get("askColor") === "on";
  const sort = Number(formData.get("sort") || 100);
  const active = formData.get("active") === "on";
  const variants = parseVariants(String(formData.get("variants") ?? ""));

  if (
    !Number.isInteger(clubId) || clubId < 1 || Object.keys(name).length === 0 ||
    !Number.isFinite(price) || price < 0 || price > 1000000 || images === undefined ||
    !Number.isInteger(sort) || sort < 0 || sort > 100000 || variants === null
  ) {
    redirect(back(locale, "error=invalid"));
  }

  const image = images?.[0] ?? null;
  const gallery = images?.slice(1) ?? [];
  const supabase = await createClient();
  let productId = id;
  if (id) {
    const { data, error } = await supabase
      .from("shop_products")
      .update({ name, description: Object.keys(description).length ? description : null, price_czk: price, image_url: image, gallery, ask_nickname: askNickname, ask_color: askColor, active, sort })
      .eq("id", id)
      .select("id");
    if (error || !data?.length) {
      console.error("saveProduct update failed", { id, code: error?.code, message: error?.message });
      redirect(back(locale, "error=save"));
    }
  } else {
    const kind = formData.get("kind") === "membership" ? "membership" : "merch";
    const plan = String(formData.get("plan") ?? "");
    if (kind === "membership" && !(PLANS as readonly string[]).includes(plan)) redirect(back(locale, "error=invalid"));
    const { data, error } = await supabase
      .from("shop_products")
      .insert({
        club_id: clubId,
        slug: slugify(name.cs ?? name.en ?? Object.values(name)[0]),
        kind,
        membership_plan: kind === "membership" ? plan : null,
        name,
        description: Object.keys(description).length ? description : null,
        price_czk: price,
        image_url: image,
        gallery,
        ask_nickname: askNickname,
        ask_color: askColor,
        active,
        sort,
      })
      .select("id")
      .single();
    if (error || !data) {
      console.error("saveProduct insert failed", { code: error?.code, message: error?.message });
      redirect(back(locale, error?.code === "23505" ? "error=duplicate" : "error=save"));
    }
    productId = data.id;
  }

  // Абонемент и товар без размеров — один безымянный вариант.
  const list = variants.length ? variants : [{ label: "", stock: null as number | null }];
  let ok = await syncVariants(productId as number, list);

  // Свои фото у вариантов: поля vimg_<id>.
  for (const [key, value] of formData.entries()) {
    const m = /^vimg_(\d+)$/.exec(key);
    if (!m) continue;
    const imgs = imageList(value);
    if (imgs === undefined) {
      ok = false;
      continue;
    }
    const { error } = await supabase.from("shop_variants").update({ images: imgs.slice(0, 12) }).eq("id", Number(m[1])).eq("product_id", productId as number);
    if (error) {
      console.error("variant images failed", { variantId: m[1], code: error.code, message: error.message });
      ok = false;
    }
  }
  // Цены по датам и срок годового абонемента (только у уже созданного товара).
  if (id && formData.has("schedule")) {
    const schedule = parseSchedule(String(formData.get("schedule") ?? ""));
    const validUntil = isoDate(String(formData.get("validUntil") ?? "").trim() || undefined);
    const ctx = await getStaffContext();
    const allowed = ctx?.clubs.some((c) => c.id === clubId && c.roles.some((r) => r === "owner" || r === "admin"));
    if (!schedule || validUntil === undefined || !allowed) {
      updateTag(SHOP_TAG);
      redirect(back(locale, "error=schedule"));
    }
    const { error } = await createAdminClient().rpc("shop_set_price_schedule", { p_product: id, p_rows: schedule, p_valid_until: validUntil });
    if (error) {
      console.error("shop_set_price_schedule failed", { id, code: error.code, message: error.message });
      ok = false;
    }
  }
  updateTag(SHOP_TAG);
  redirect(back(locale, ok ? "saved=1" : "error=save"));
}

export async function setProductActive(formData: FormData) {
  const locale = toLocale(formData.get("locale"));
  const id = Number(formData.get("productId"));
  if (!Number.isInteger(id) || id < 1) redirect(back(locale));
  const supabase = await createClient();
  const { error } = await supabase.from("shop_products").update({ active: formData.get("active") === "1" }).eq("id", id);
  if (error) console.error("setProductActive failed", { id, code: error.code, message: error.message });
  updateTag(SHOP_TAG);
  redirect(back(locale, error ? "error=save" : undefined));
}

/** Заказ оплачен на месте: наличные / карта / перевод. Дальше всё делает база (абонемент выдаётся сам). */
export async function markOrderPaid(formData: FormData) {
  const locale = toLocale(formData.get("locale"));
  const id = Number(formData.get("orderId"));
  const method = String(formData.get("method"));
  if (!Number.isInteger(id) || id < 1 || !(PAY_METHODS as readonly string[]).includes(method)) redirect(back(locale, "error=invalid"));

  const supabase = await createClient();
  const { data: order } = await supabase.from("shop_orders").select("id, club_id, profile_id, total_czk, status").eq("id", id).maybeSingle();
  if (!order || order.status !== "pending") redirect(back(locale, "error=save"));

  const { error } = await supabase.from("payments").insert({
    club_id: order.club_id,
    profile_id: order.profile_id,
    purpose: "shop",
    order_id: order.id,
    amount_czk: order.total_czk,
    method,
  });
  if (error && error.code !== "23505") {
    console.error("markOrderPaid failed", { id, code: error.code, message: error.message });
    redirect(back(locale, "error=save"));
  }
  updateTag(SHOP_TAG);
  redirect(back(locale, "orderPaid=1"));
}

export async function setOrderStatus(formData: FormData) {
  const locale = toLocale(formData.get("locale"));
  const id = Number(formData.get("orderId"));
  const status = String(formData.get("status"));
  if (!Number.isInteger(id) || id < 1 || (status !== "fulfilled" && status !== "cancelled")) redirect(back(locale, "error=invalid"));
  const supabase = await createClient();
  const { data, error } = await supabase.from("shop_orders").update({ status }).eq("id", id).select("id");
  if (error || !data?.length) {
    console.error("setOrderStatus failed", { id, status, code: error?.code, message: error?.message });
    redirect(back(locale, "error=save"));
  }
  updateTag(SHOP_TAG);
  redirect(back(locale));
}

/**
 * Загрузка фото товара: сервер проверяет, что это владелец/админ клуба, и выдаёт одноразовые
 * ссылки на загрузку в хранилище. Файл идёт из браузера прямо в Supabase (уже сжатый).
 */
export async function createPhotoUploads(clubId: number, count: number) {
  const ctx = await getStaffContext();
  const club = ctx?.clubs.find((c) => c.id === clubId);
  if (!club || !club.roles.some((r) => r === "owner" || r === "admin")) return { error: "forbidden" as const };
  const n = Math.min(Math.max(Math.trunc(count), 1), 12);

  const admin = createAdminClient();
  const uploads: { path: string; token: string; publicUrl: string }[] = [];
  for (let i = 0; i < n; i++) {
    const path = `club-${clubId}/${crypto.randomUUID()}.webp`;
    const { data, error } = await admin.storage.from("shop").createSignedUploadUrl(path);
    if (error || !data) {
      console.error("createPhotoUploads failed", { clubId, message: error?.message });
      return { error: "failed" as const };
    }
    uploads.push({ path: data.path, token: data.token, publicUrl: admin.storage.from("shop").getPublicUrl(data.path).data.publicUrl });
  }
  return { uploads };
}
