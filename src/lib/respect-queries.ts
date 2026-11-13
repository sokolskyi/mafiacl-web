import "server-only";
import { createAdminClient, isAdminConfigured } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { RespectReason } from "@/lib/respect";

export type RespectEntry = { id: number; amount: number; reason: RespectReason; note: string | null; createdAt: string };

/** Баланс игрока (сумма всех движений). */
export async function getRespectBalance(profileId: string): Promise<number> {
  if (!isAdminConfigured) return 0;
  const { data, error } = await createAdminClient().rpc("respect_balance", { p_profile: profileId });
  if (error) console.error("respect_balance failed", { code: error.code, message: error.message });
  return typeof data === "number" ? data : 0;
}

/** Последние движения игрока — читаются от его имени (RLS: только свои). */
export async function getMyRespectHistory(limit = 12): Promise<RespectEntry[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("respect_ledger")
    .select("id, amount, reason, note, created_at")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit);
  return (data ?? []).map((r) => ({ id: r.id, amount: r.amount, reason: r.reason as RespectReason, note: r.note, createdAt: r.created_at }));
}

export type CodeBatch = { batch: string; amount: number; total: number; redeemed: number; createdAt: string };
export type CodeRow = { code: string; amount: number; redeemedAt: string | null; redeemedBy: string | null };

/** Пачки кодов физических монет (для админки). */
export async function getCodeBatches(clubIds: number[]): Promise<CodeBatch[]> {
  const { data } = await createAdminClient()
    .from("respect_codes")
    .select("batch, amount, redeemed_at, created_at")
    .in("club_id", clubIds)
    .order("created_at", { ascending: false })
    .limit(5000);
  const m = new Map<string, CodeBatch>();
  for (const r of data ?? []) {
    const b = m.get(r.batch) ?? { batch: r.batch, amount: r.amount, total: 0, redeemed: 0, createdAt: r.created_at };
    b.total++;
    if (r.redeemed_at) b.redeemed++;
    m.set(r.batch, b);
  }
  return [...m.values()];
}

export async function getBatchCodes(clubIds: number[], batch: string): Promise<CodeRow[]> {
  const { data } = await createAdminClient()
    .from("respect_codes")
    .select("code, amount, redeemed_at, profiles!respect_codes_redeemed_by_fkey ( nickname )")
    .in("club_id", clubIds)
    .eq("batch", batch)
    .order("code")
    .limit(400);
  return (data ?? []).map((r) => ({
    code: r.code,
    amount: r.amount,
    redeemedAt: r.redeemed_at,
    redeemedBy: (r.profiles as unknown as { nickname: string | null } | null)?.nickname ?? null,
  }));
}

export type LedgerRow = RespectEntry & { nickname: string | null };

/** Последние движения по клубу — журнал для владельца. */
export async function getClubLedger(clubIds: number[], limit = 40): Promise<LedgerRow[]> {
  const { data } = await createAdminClient()
    .from("respect_ledger")
    .select("id, amount, reason, note, created_at, profiles!respect_ledger_profile_id_fkey ( nickname )")
    .in("club_id", clubIds)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit);
  return (data ?? []).map((r) => ({
    id: r.id,
    amount: r.amount,
    reason: r.reason as RespectReason,
    note: r.note,
    createdAt: r.created_at,
    nickname: (r.profiles as unknown as { nickname: string | null } | null)?.nickname ?? null,
  }));
}

/** Сколько Respect всего на руках у игроков клуба (обязательство клуба). */
export async function getOutstanding(clubIds: number[]): Promise<number> {
  const { data, error } = await createAdminClient().rpc("respect_outstanding", { p_clubs: clubIds });
  if (error) console.error("respect_outstanding failed", { code: error.code, message: error.message });
  return typeof data === "number" ? data : 0;
}
