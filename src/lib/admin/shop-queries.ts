import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Localized } from "@/lib/games";

export type AdminProduct = {
  id: number;
  slug: string;
  kind: "merch" | "membership";
  plan: string | null;
  name: Localized;
  description: Localized | null;
  priceCzk: number;
  imageUrl: string | null;
  gallery: string[];
  askNickname: boolean;
  askColor: boolean;
  active: boolean;
  sort: number;
  variants: { id: number; label: string; stock: number | null }[];
};

export async function getAdminProducts(clubId: number): Promise<AdminProduct[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shop_products")
    .select("id, slug, kind, membership_plan, name, description, price_czk, image_url, gallery, ask_nickname, ask_color, active, sort, shop_variants ( id, label, stock, sort )")
    .eq("club_id", clubId)
    .order("sort")
    .order("id");
  if (error) {
    console.error("getAdminProducts failed", { code: error.code, message: error.message });
    return [];
  }
  return (data ?? []).map((p) => ({
    id: p.id,
    slug: p.slug,
    kind: p.kind as AdminProduct["kind"],
    plan: p.membership_plan,
    name: (p.name ?? {}) as Localized,
    description: (p.description ?? null) as Localized | null,
    priceCzk: Number(p.price_czk),
    imageUrl: p.image_url,
    gallery: p.gallery ?? [],
    askNickname: p.ask_nickname,
    askColor: p.ask_color,
    active: p.active,
    sort: p.sort,
    variants: [...(p.shop_variants ?? [])].sort((a, b) => a.sort - b.sort || a.id - b.id).map((v) => ({ id: v.id, label: v.label, stock: v.stock })),
  }));
}

export type AdminOrder = {
  id: number;
  status: "pending" | "paid" | "fulfilled" | "cancelled";
  totalCzk: number;
  createdAt: string;
  buyer: string;
  items: { id: number; name: Localized; label: string; nickname: string | null; color: string | null; qty: number }[];
};

export async function getAdminOrders(clubId: number): Promise<AdminOrder[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shop_orders")
    .select("id, status, total_czk, created_at, profiles!shop_orders_profile_id_fkey ( nickname, display_name ), shop_order_items ( id, name, variant_label, nickname, color, qty )")
    .eq("club_id", clubId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) {
    console.error("getAdminOrders failed", { code: error.code, message: error.message });
    return [];
  }
  return (data ?? []).map((o) => {
    const p = o.profiles as unknown as { nickname: string | null; display_name: string | null } | null;
    return {
      id: o.id,
      status: o.status as AdminOrder["status"],
      totalCzk: Number(o.total_czk),
      createdAt: o.created_at,
      buyer: p?.nickname ?? p?.display_name ?? "—",
      items: (o.shop_order_items ?? []).map((i) => ({ id: i.id, name: i.name as Localized, label: i.variant_label, nickname: i.nickname, color: i.color, qty: i.qty })),
    };
  });
}
