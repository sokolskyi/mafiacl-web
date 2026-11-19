/** Общее для сервера и браузера: виды реакций, лимиты комментариев, адреса статей. */

/** Реакции на статьи — в этом порядке и показываются. */
export const REACTIONS = [
  { kind: "fire", emoji: "🔥" },
  { kind: "target", emoji: "🎯" },
  { kind: "wow", emoji: "🤯" },
  { kind: "doubt", emoji: "🤔" },
  { kind: "lol", emoji: "😂" },
] as const;
export type ReactionKind = (typeof REACTIONS)[number]["kind"];
export const isReaction = (v: unknown): v is ReactionKind => REACTIONS.some((r) => r.kind === v);

export const COMMENT_MAX = 1000;
export const SLUG_RE = /^(post-\d{1,12}|season-review-\d{4}-\d{2})$/;
