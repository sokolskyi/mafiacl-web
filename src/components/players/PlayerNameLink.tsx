import { Fragment, type ReactNode } from "react";
import { Link } from "@/i18n/navigation";

/**
 * Ник (или пара ников «A и B») ссылками на страницы игроков. Ссылка ставится только на известных
 * клубу игроков (getKnownPlayers), названия команд и прочий текст остаются как есть.
 */
export function playerLinks(text: string, known: Record<string, string>, className = "hover:underline"): ReactNode {
  const parts = text.split(" и ");
  return parts.map((part, i) => {
    const nick = known[part.trim().toLowerCase()];
    return (
      <Fragment key={i}>
        {i > 0 && " и "}
        {nick ? (
          <Link href={{ pathname: "/players/[nick]", params: { nick } }} className={className}>
            {part}
          </Link>
        ) : (
          part
        )}
      </Fragment>
    );
  });
}
