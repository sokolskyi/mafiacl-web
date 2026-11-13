"use server";

import { revalidatePath, updateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { MATCHES_TAG } from "@/lib/players";

const BUCKET = "avatars";

async function currentUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return data?.claims.sub ?? null;
}

/** Одноразовая ссылка на загрузку фото игрока (файл кладётся в папку игрока). */
export async function createAvatarUpload() {
  const userId = await currentUser();
  if (!userId) return { error: "forbidden" as const };
  const admin = createAdminClient();
  const path = `${userId}/${crypto.randomUUID()}.webp`;
  const { data, error } = await admin.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) {
    console.error("createAvatarUpload failed", { message: error?.message });
    return { error: "failed" as const };
  }
  return { path: data.path, token: data.token };
}

/** Поставить загруженное фото в профиль (или убрать фото, если path пустой). Старое своё фото удаляем. */
export async function setAvatar(path: string | null) {
  const userId = await currentUser();
  if (!userId) return { error: "forbidden" as const };
  if (path !== null && !new RegExp(`^${userId}/[0-9a-f-]{36}\\.webp$`).test(path)) return { error: "invalid" as const };
  const admin = createAdminClient();
  const storage = admin.storage.from(BUCKET);
  if (path) {
    const { data: files } = await storage.list(userId, { search: path.split("/")[1] });
    if (!files?.length) return { error: "invalid" as const };
  }
  const url = path ? storage.getPublicUrl(path).data.publicUrl : null;
  const { error } = await admin.from("profiles").update({ avatar_url: url }).eq("id", userId);
  if (error) {
    console.error("setAvatar failed", { code: error.code, message: error.message });
    return { error: "failed" as const };
  }
  // Убираем прежние загруженные фото игрока, кроме нового.
  const { data: old } = await storage.list(userId);
  const stale = (old ?? []).map((f) => `${userId}/${f.name}`).filter((p) => p !== path);
  if (stale.length) await storage.remove(stale);
  updateTag(MATCHES_TAG);
  revalidatePath("/", "layout");
  return { ok: true as const, url };
}
