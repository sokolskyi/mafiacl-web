import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const TESTIMONIALS_TAG = "testimonials";
export const EVENT_TYPES = ["teambuilding", "party", "birthday", "office", "club", "other"] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export type Testimonial = {
  id: number;
  author: string;
  photoUrl: string | null;
  company: string | null;
  eventType: EventType | null;
  eventDate: string | null;
  body: string;
};

/** Отзывы о корпоративах (кеш; сбрасывается при правках в админке). */
export async function getTestimonials(clubSlug: string): Promise<Testimonial[]> {
  "use cache";
  cacheTag(TESTIMONIALS_TAG);
  cacheLife("hours");
  if (!isSupabaseConfigured) return [];
  const db = createPublicClient();
  const { data, error } = await db
    .from("testimonials")
    .select("id, author, photo_url, company, event_type, event_date, body, sort, clubs!inner ( slug )")
    .eq("clubs.slug", clubSlug)
    .eq("kind", "corporate")
    .eq("active", true)
    .order("sort")
    .order("id", { ascending: false });
  if (error) console.error("getTestimonials failed", { code: error.code, message: error.message });
  return (data ?? []).map((r) => ({
    id: r.id,
    author: r.author,
    photoUrl: r.photo_url,
    company: r.company,
    eventType: (r.event_type ?? null) as EventType | null,
    eventDate: r.event_date,
    body: r.body,
  }));
}
