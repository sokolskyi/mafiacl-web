/** Мастер-классы с YouTube-канала клуба (плейлист «Мастер-классы»). */
export const MASTERCLASS_PLAYLIST = "https://www.youtube.com/playlist?list=PLtrPZrjZQNKfdrWl1J8NzaKbNYncV1On4";

export type Masterclass = { id: string; author: string; title: string; lang: "ru" | "en"; length: string };

// Новые сверху. Название — как на YouTube, без префикса «Мастер-класс. Г-н …».
export const MASTERCLASSES: Masterclass[] = [
  { id: "qyicbukIocM", author: "YeS", title: "How to win at Mafia. Top life hacks and tips", lang: "en", length: "1:46:41" },
  { id: "Ym1iCo8E_BU", author: "YeS", title: "Лайфхаки в мафии: тизер", lang: "ru", length: "1:00" },
  { id: "Iq9wgLWyOuM", author: "Дин", title: "Как научиться играть в мафию", lang: "ru", length: "1:03:03" },
  { id: "pPGRLW8XWr8", author: "Бенджамин", title: "Советы по игре за красную карту", lang: "ru", length: "1:12:09" },
  { id: "UueldZ04Twc", author: "YeS", title: "Invite", lang: "ru", length: "0:58" },
  { id: "dDMai9ILrR8", author: "Амахонда", title: "Выбор модели поведения за игровым столом", lang: "ru", length: "1:36:46" },
  { id: "lJce4O8vcrs", author: "Сарказм", title: "How to win as Red", lang: "en", length: "53:20" },
  { id: "Q4aWXT6BRO0", author: "Flash", title: "Игра лже-шерифом", lang: "ru", length: "48:28" },
  { id: "Z-rpro1NjUA", author: "Бордо", title: "Playing for the Black Card", lang: "en", length: "59:32" },
  { id: "Oiwjp5wE7-Q", author: "Вольфрам", title: "How to win as Mafia", lang: "en", length: "52:19" },
  { id: "Guz1entTTF0", author: "Персик", title: "Логическая составляющая игры «мафия»", lang: "ru", length: "1:16:39" },
  { id: "aRfEf6TJ6yg", author: "RiT", title: "Математическая и позиционная составляющие игры", lang: "ru", length: "55:58" },
];
