import type { Masterclass } from "@/lib/masterclasses";

/** Карточки видео из плейлиста YouTube: превью, длительность, автор, название и ссылка на весь плейлист. */
export function YouTubeCards({
  id,
  title,
  lead,
  allLabel,
  items,
  playlist,
  className = "mt-16",
  headingClass = "font-display text-3xl font-extrabold uppercase",
}: {
  id: string;
  title: string;
  lead: string;
  allLabel: string;
  items: Masterclass[];
  playlist: string;
  className?: string;
  headingClass?: string;
}) {
  const list = playlist.split("list=")[1];
  return (
    <section aria-labelledby={id} className={className}>
      <h2 id={id} className={headingClass}>{title}</h2>
      <p className="mt-2 max-w-3xl text-neutral-300">{lead}</p>
      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((m) => (
          <li key={m.id}>
            <a
              href={`https://www.youtube.com/watch?v=${m.id}&list=${list}`}
              target="_blank"
              rel="noopener"
              className="group block h-full overflow-hidden rounded-lg border border-white/15 bg-neutral-950/60 hover:border-red-500/70"
            >
              <div className="relative aspect-video bg-neutral-900">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`https://i.ytimg.com/vi/${m.id}/hqdefault.jpg`} alt="" loading="lazy" className="h-full w-full object-cover opacity-90 group-hover:opacity-100" />
                <span className="absolute bottom-2 right-2 rounded bg-black/80 px-1.5 py-0.5 font-mono text-xs">{m.length}</span>
              </div>
              <div className="p-4">
                <p className="text-sm text-neutral-400">
                  {m.author}
                  {m.lang === "en" && <span className="ml-2 rounded bg-white/10 px-1.5 text-xs font-semibold">EN</span>}
                </p>
                <p className="mt-1 font-semibold leading-snug">{m.title}</p>
              </div>
            </a>
          </li>
        ))}
      </ul>
      <p className="mt-6">
        <a href={playlist} target="_blank" rel="noopener" className="inline-flex min-h-12 items-center rounded-full border border-white/55 px-6 font-bold hover:bg-white/10">
          {allLabel} ↗
        </a>
      </p>
    </section>
  );
}
