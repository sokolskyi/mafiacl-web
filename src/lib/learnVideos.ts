/** Видео для новичков с YouTube-канала клуба (плейлисты «Школа мафии», «What is the Mafia», «Мафия за 7 секунд»). */
const PL = (id: string) => `https://www.youtube.com/playlist?list=${id}`;

export const SCHOOL = { playlist: PL("PLtrPZrjZQNKdz0Ef5-LrQH3Z6f5ZChvOg"), cover: "682iQ9x4brM", count: 7 };

/** Короткие ролики об основах игры; подпись темы берётся из сообщений learn.videos.topics.<key>. */
export const BASICS = {
  playlist: PL("PLtrPZrjZQNKcXuFoFTJERUkGoOUeNsFaC"),
  items: [
    { v: "0jo7v8C0wbY", key: "intro" },
    { v: "pQ0_UXfBEpk", key: "mafiaGame" },
    { v: "9AQTYgeRPlQ", key: "history" },
    { v: "avXxiQFo_E0", key: "growth" },
    { v: "ZYAgMSGNhKE", key: "essence" },
    { v: "ZNgY3UnfmRo", key: "order" },
    { v: "q8MC-qCHa6k", key: "voting" },
    { v: "KWf_QtW1J8U", key: "shootout" },
    { v: "i7f-540SW7o", key: "civilian" },
    { v: "yEgxo6meHFQ", key: "sheriff" },
    { v: "HRabJaw6njs", key: "mafia" },
    { v: "HIpZoZsO_y8", key: "don" },
    { v: "XbsC9A5WCpM", key: "deal" },
    { v: "IH3azq80t84", key: "kill" },
    { v: "Dik-EiqxeLY", key: "rules" },
    { v: "1z3oegmQnWs", key: "host" },
    { v: "U068XC-LU6U", key: "critical" },
  ],
} as const;

/** «Мафия за 7 секунд»: советы опытных игроков клуба. */
export const SEVEN = {
  playlist: PL("PLtrPZrjZQNKdI479MJTVjo7aFyTwcrvZ3"),
  items: [
    { v: "odZSeqOTu1I", author: "RiT", length: "3:16" },
    { v: "bDLAMl2XWbI", author: "Персик", length: "2:27" },
    { v: "i_fSz2qoDu0", author: "Вольфрам", length: "4:28" },
    { v: "WRwnMI6QS5g", author: "Бордо", length: "3:46" },
    { v: "Oftz4ak2vak", author: "Flash", length: "3:51" },
    { v: "SE2hl4T0WxU", author: "Сарказм", length: "5:28" },
    { v: "Q0U3IS8VlfI", author: "Амахонда", length: "3:17" },
    { v: "8MJV2kcFzvw", author: "Бенджамин", length: "5:36" },
    { v: "ZXmfM60wjA0", author: "Дин", length: "5:21" },
    { v: "7yBW3oTvcoU", author: "YeS", length: "5:23" },
  ],
};
