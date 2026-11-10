export type BotLang = "cs" | "ru" | "uk" | "en";

export function botLang(code?: string | null): BotLang {
  const c = (code ?? "").slice(0, 2);
  return c === "cs" || c === "sk" ? "cs" : c === "uk" ? "uk" : c === "ru" || c === "be" || c === "kk" ? "ru" : c === "en" ? "en" : "ru";
}

const T = {
  welcome: {
    cs: "Ahoj! Jsem bot klubu <b>MafiaCL Prague</b>.\nPropojte si mě s účtem na webu — budu posílat připomínky her a zápis zvládnete přímo tady.",
    ru: "Привет! Я бот клуба <b>MafiaCL Prague</b>.\nСвяжите меня с аккаунтом на сайте — буду присылать напоминания об играх, а записываться можно прямо здесь.",
    uk: "Привіт! Я бот клубу <b>MafiaCL Prague</b>.\nЗв'яжіть мене з акаунтом на сайті — надсилатиму нагадування про ігри, а записуватися можна прямо тут.",
    en: "Hi! I'm the <b>MafiaCL Prague</b> club bot.\nLink me to your website account — I'll send game reminders and you can sign up right here.",
  },
  linkButton: { cs: "Propojit účet", ru: "Связать аккаунт", uk: "Зв'язати акаунт", en: "Link account" },
  linked: {
    cs: "Hotovo, {name}! Účet je propojený. Nejbližší hry: /games",
    ru: "Готово, {name}! Аккаунт связан. Ближайшие игры: /games",
    uk: "Готово, {name}! Акаунт зв'язано. Найближчі ігри: /games",
    en: "Done, {name}! Your account is linked. Upcoming games: /games",
  },
  badToken: {
    cs: "Odkaz vypršel nebo už byl použit. Otevřete znovu svůj účet na webu a klikněte „Připojit Telegram“.",
    ru: "Ссылка устарела или уже использована. Откройте кабинет на сайте и снова нажмите «Подключить Telegram».",
    uk: "Посилання застаріло або вже використане. Відкрийте кабінет на сайті й знову натисніть «Підключити Telegram».",
    en: "This link has expired or was already used. Open your account on the website and tap “Connect Telegram” again.",
  },
  notLinked: {
    cs: "Nejdřív propojte bota s účtem na webu.",
    ru: "Сначала свяжите бота с аккаунтом на сайте.",
    uk: "Спершу зв'яжіть бота з акаунтом на сайті.",
    en: "First link the bot to your website account.",
  },
  stopped: {
    cs: "Odpojeno. Připomínky už chodit nebudou. Znovu propojit můžete v účtu na webu.",
    ru: "Отключено. Напоминания больше приходить не будут. Снова подключить можно в кабинете на сайте.",
    uk: "Відключено. Нагадування більше не надходитимуть. Знову підключити можна в кабінеті на сайті.",
    en: "Disconnected. No more reminders. You can reconnect from your website account.",
  },
  help: {
    cs: "/games — nejbližší hry a zápis\n/stop — odpojit připomínky",
    ru: "/games — ближайшие игры и запись\n/stop — отключить напоминания",
    uk: "/games — найближчі ігри та запис\n/stop — вимкнути нагадування",
    en: "/games — upcoming games and sign-up\n/stop — turn off reminders",
  },
  gamesTitle: { cs: "<b>Nejbližší hry</b>", ru: "<b>Ближайшие игры</b>", uk: "<b>Найближчі ігри</b>", en: "<b>Upcoming games</b>" },
  noGames: { cs: "Zatím žádné hry.", ru: "Ближайших игр пока нет.", uk: "Найближчих ігор поки немає.", en: "No upcoming games yet." },
  join: { cs: "✅ Přihlásit", ru: "✅ Записаться", uk: "✅ Записатися", en: "✅ Sign up" },
  joinWait: { cs: "⏳ Na čekačku", ru: "⏳ В лист ожидания", uk: "⏳ До листа очікування", en: "⏳ Waitlist" },
  leave: { cs: "❌ Zrušit", ru: "❌ Отменить", uk: "❌ Скасувати", en: "❌ Cancel" },
  site: { cs: "Rozpis na webu", ru: "Расписание на сайте", uk: "Розклад на сайті", en: "Schedule on the website" },
  joined: { cs: "Jste přihlášeni ✓", ru: "Вы записаны ✓", uk: "Ви записані ✓", en: "You're in ✓" },
  waitlisted: { cs: "Jste na čekací listině", ru: "Вы в листе ожидания", uk: "Ви в листі очікування", en: "You're on the waitlist" },
  left: { cs: "Zápis zrušen", ru: "Запись отменена", uk: "Запис скасовано", en: "Sign-up cancelled" },
  closed: { cs: "Zápis na tuto hru je uzavřen", ru: "Запись на эту игру закрыта", uk: "Запис на цю гру закрито", en: "Sign-up for this game is closed" },
  error: { cs: "Něco se pokazilo, zkuste to znovu", ru: "Что-то пошло не так, попробуйте ещё раз", uk: "Щось пішло не так, спробуйте ще раз", en: "Something went wrong, try again" },
  seats: { cs: "{c}/{cap} míst", ru: "{c}/{cap} мест", uk: "{c}/{cap} місць", en: "{c}/{cap} seats" },
  you: { cs: "· jste přihlášeni", ru: "· вы записаны", uk: "· ви записані", en: "· you're in" },
  youWait: { cs: "· čekačka", ru: "· лист ожидания", uk: "· лист очікування", en: "· waitlist" },
  reminder: {
    cs: "⏰ Připomínka: dnes v <b>{time}</b> — {title}\n📍 {venue}",
    ru: "⏰ Напоминание: сегодня в <b>{time}</b> — {title}\n📍 {venue}",
    uk: "⏰ Нагадування: сьогодні о <b>{time}</b> — {title}\n📍 {venue}",
    en: "⏰ Reminder: today at <b>{time}</b> — {title}\n📍 {venue}",
  },
  late: { cs: "Od {time} minus body za pozdní příchod.", ru: "С {time} минус баллы за опоздание.", uk: "З {time} мінус бали за запізнення.", en: "Late penalty from {time}." },
  cantCome: { cs: "Nemůžete přijít? Zrušte zápis — místo dostane další.", ru: "Не получается прийти? Отмените запись — место получит следующий.", uk: "Не виходить прийти? Скасуйте запис — місце отримає наступний.", en: "Can't make it? Cancel so the next person gets your seat." },
  promoted: {
    cs: "🎉 Uvolnilo se místo — jste v sestavě!\n<b>{when}</b> — {title}\n📍 {venue}",
    ru: "🎉 Освободилось место — вы в основном составе!\n<b>{when}</b> — {title}\n📍 {venue}",
    uk: "🎉 Звільнилося місце — ви в основному складі!\n<b>{when}</b> — {title}\n📍 {venue}",
    en: "🎉 A seat opened up — you're in!\n<b>{when}</b> — {title}\n📍 {venue}",
  },
  cancelledGame: {
    cs: "⚠️ Hra <b>{when}</b> — {title} je zrušena.",
    ru: "⚠️ Игра <b>{when}</b> — {title} отменена.",
    uk: "⚠️ Гру <b>{when}</b> — {title} скасовано.",
    en: "⚠️ The game <b>{when}</b> — {title} is cancelled.",
  },
  tableFull: {
    cs: "✅ Stůl je plný! Návrh příspěvku:",
    ru: "✅ Стол собран! Черновик поста:",
    uk: "✅ Стіл зібрано! Чернетка допису:",
    en: "✅ The table is full! Post draft:",
  },
} as const;

export type TextKey = keyof typeof T;

export function t(lang: BotLang, key: TextKey, vars: Record<string, string | number> = {}) {
  let s: string = T[key][lang];
  for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}
