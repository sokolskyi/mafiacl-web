#!/usr/bin/env python3
"""
Разбор архива ФИИМ (data/fiim/raw/<id>.html, см. scripts/fiim-archive.mjs) в JSON:
data/fiim/results/<id>.json — этапы турнира (отбор, полуфинал, финал, серии) с таблицами итогов.

Колонки в разные годы разные (Б/П/Л/Д/Ш/М/У, Б/Дб/Л1/Л2, Σ/доп.баллы/Ci…), поэтому значения
хранятся как есть по названиям колонок, а расшифровка — в legend (с той же страницы ФИИМ).
Запуск: python3 scripts/fiim-parse.py (нужны beautifulsoup4 и lxml).
"""
import json
import os
import re

from bs4 import BeautifulSoup

RAW = "data/fiim/raw"
OUT = "data/fiim/results"
TOTAL_COLS = ("Итоговый Кф", "Б", "Σ")
CITIES = "Харьков|Киев|Днепр|Полтава|Одесса|Запорожье|Винница|Львов|Донецк|Тель-Авив|Краматорск|Кривой Рог|Херсон|Николаев|Черкассы|Кременчуг|Мариуполь|Прага|Минск"


def cells(tr):
    return [c.get_text(" ", strip=True).replace("&dash;", "−") for c in tr.find_all(["th", "td"])]


def columns(table):
    rows = table.find_all("tr")
    head = cells(rows[0])
    sub = cells(rows[1]) if len(rows) > 1 else []
    if sub and any(x.replace(" ", "") == "Σдб" for x in sub):
        i = head.index("Доп.баллы")
        names = ["Доп.баллы" if x.replace(" ", "") == "Σдб" else f"Доп.баллы {x}" for x in sub]
        return head[:i] + names + head[i + 1 :], rows[2:]
    return head, rows[1:]


def number(v):
    v = v.strip()
    if v == "":
        return None
    try:
        return float(v) if "." in v else int(v)
    except ValueError:
        return v


def player(raw):
    """«06 Niko», «[10] Октава», «Анархия (Mafia сlub "Champions league" Kharkiv, Харьков)», «Lucky (-1)»."""
    club = penalty = None
    m = re.search(r"\s*\(([^()]*,[^()]*)\)\s*$", raw)
    if m:
        club, raw = m.group(1).strip(), raw[: m.start()]
    m = re.search(r"\s*\((?:штраф\s*)?(-?\d+(?:\.\d+)?)\)\s*$", raw)
    if m:
        penalty, raw = number(m.group(1)), raw[: m.start()]
    # «Анархия (Харьков)», «Совесть (Тель-Авив)» — город в скобках, а не часть ника.
    m = re.search(r"\s*\((" + CITIES + r")\)\s*$", raw)
    if m:
        club, raw = club or m.group(1), raw[: m.start()]
    seat = None
    m = re.match(r"^\[(\d+)\]\s+(.+)$", raw)
    if m:
        seat, raw = int(m.group(1)), m.group(2)
    m = re.match(r"^(\d{1,3})\s+(\S.*)$", raw)
    if m:  # номер игрока (код) перед ником; ник из одних цифр («13») не трогаем
        seat, raw = int(m.group(1)), m.group(2)
    return raw.strip(), club, penalty, seat


def legend(soup):
    out = {}
    for h in soup.find_all("h3"):
        if "Условные" not in h.get_text():
            continue
        box = h.find_next_sibling()
        if not box:
            continue
        for strong in box.find_all("strong"):
            key = strong.get_text(strip=True)
            text = ""
            for sib in strong.next_siblings:
                if getattr(sib, "name", None) == "strong":
                    break
                text += sib.get_text(" ") if hasattr(sib, "get_text") else str(sib)
            text = re.sub(r"\s+", " ", text).strip(" -–;.\n")
            if key and text and key not in out:
                out[key] = text
    return out


def parse(meta):
    path = f"{RAW}/{meta['fiim_id']}.html"
    soup = BeautifulSoup(open(path, encoding="utf8").read(), "lxml")
    res = soup.select_one("#results")
    stages = []
    if res:
        own = None  # первая h2 — сам турнир; дальше на странице финала серии идут чужие этапы
        group = None
        title = None
        note = None
        for el in res.find_all(["h1", "h2", "h3", "strong", "table"]):
            if el.name == "h2":
                group = el.get_text(" ", strip=True)
                own = own or group
                continue
            if group and own and group != own:
                continue
            if el.name in ("h1", "h3"):
                t = el.get_text(" ", strip=True)
                if "Условные" in t:
                    break
                title, note = t, None
                continue
            if el.name == "strong":
                t = el.get_text(" ", strip=True)
                if "побед" in t:
                    note = t
                continue
            if el.find("table"):
                continue
            cols, rows = columns(el)
            stage = stages[-1] if stages and stages[-1]["title"] == (title or "Итоги") and stages[-1]["columns"] == cols else None
            if not stage:
                stage = {"title": title or "Итоги", "note": note, "columns": cols, "rows": []}
                stages.append(stage)
            for tr in rows:
                v = cells(tr)
                if len(v) != len(cols) or not v[0]:
                    continue
                values = dict(zip(cols, v))
                nick_col = next(c for c in cols if c.startswith("Игрок") or c == "Ник")
                nick, club, penalty, seat = player(values.pop(nick_col))
                place = values.pop("№", "")
                total = next((number(values[c]) for c in TOTAL_COLS if c in values), None)
                stage["rows"].append(
                    {
                        "place": number(place),
                        "nick": nick,
                        "club": club,
                        "penalty": penalty,
                        "seat": seat,
                        "total": total,
                        "values": {k: number(x) for k, x in values.items()},
                    }
                )
    return {
        **{k: meta[k] for k in ("fiim_id", "url", "date", "name", "city", "kind", "ours", "project")},
        "legend": legend(soup),
        "stages": stages,
    }


def main():
    os.makedirs(OUT, exist_ok=True)
    tournaments = json.load(open("data/fiim/tournaments.json", encoding="utf8"))["tournaments"]
    for t in tournaments:
        if not t.get("fiim_id") or not os.path.exists(f"{RAW}/{t['fiim_id']}.html"):
            continue
        data = parse(t)
        json.dump(data, open(f"{OUT}/{t['fiim_id']}.json", "w", encoding="utf8"), ensure_ascii=False, indent=1)
        size = ", ".join(f"{s['title']} {len(s['rows'])}" for s in data["stages"]) or "нет итогов"
        print(f"{t['fiim_id']:>5} {'наш ' if t['ours'] else 'лига'} {t['name'][:45]:45} {size}")


if __name__ == "__main__":
    main()


LEGACY = "data/legacy-mafiacl/mafia_stars_results"


def legacy_stage(page_id, title):
    """Таблица со старого mafiacl.com (веб-архив): /mafia_stars_results/<id>."""
    soup = BeautifulSoup(open(f"{LEGACY}/{page_id}.html", encoding="utf8").read(), "lxml")
    h = next(x for x in soup.find_all(["h3", "h4"]) if "Рейтинг" in x.get_text())
    label = h.find_next("label")
    table = h.find_next("table")
    head = table.find("thead").find_all("th")
    # Ш/Д/М на старом сайте — число игр в роли, а не побед, как на ФИИМ: даём свои названия колонок.
    rename = {"Ш": "Шер", "Д": "Дон", "М": "Маф"}
    cols = [rename.get(c.get_text(strip=True), c.get_text(strip=True)) for c in head]
    legend = {rename.get(c.get_text(strip=True), c.get_text(strip=True)): c.get("title") for c in head if c.get("title")}
    rows = []
    for tr in [tr for tr in table.find_all("tr") if not tr.find_parent("thead")]:
        v = [c.get_text(" ", strip=True) for c in tr.find_all(["td", "th"])]
        if len(v) != len(cols):
            continue
        values = dict(zip(cols, v))
        nick, club, penalty, seat = player(values.pop("Ник"))
        place = values.pop("№")
        rows.append({"place": number(place), "nick": nick, "club": club, "penalty": penalty, "seat": None,
                     "total": number(values["Б"]), "values": {k: number(x) for k, x in values.items()}})
    note = label.get_text(" ", strip=True) if label and label.find_previous(["h3", "h4"]) is h else None
    if note and not re.search(r"\d", note):  # «отсутствует» — коэффициента сложности не было
        note = None
    return {"title": title, "note": note, "columns": cols, "rows": rows}, legend


def legacy_url(page_id):
    first = open(f"{LEGACY}/{page_id}.html", encoding="utf8").readline()
    m = re.search(r"<!-- (\S+) -->", first)
    return m.group(1) if m else None


def mcl_2016_2017():
    """Mafia Champions League 2016/2017: серии и финал — со старого mafiacl.com, рейтинг отбора и места — из постов группы MCL во ВКонтакте."""
    series = [10, 11, 13, 15, 17, 19, 25, 26, 29]
    final, legend = legacy_stage(31, "Финальная серия")
    # Коэффициенты отбора перед финалом (пост группы MCL 26.05.2017), ИК = 0,6 × отбор + 0,4 × финал.
    qual = {"Franklin": (15.00, 30), "Дин": (14.12, 30), "Lucky": (13.31, 40), "Гармония": (12.68, 30), "Малыш": (13.00, 30),
            "Анархия": (12.67, 30), "Ятна": (12.35, 30), "13": (12.05, 30), "Лача": (11.17, 30), "YeS": (10.53, 40)}
    fin = {r["nick"]: r for r in final["rows"]}
    total = []
    for nick, (q, games) in qual.items():
        f = fin[nick]["total"] * 10 / fin[nick]["values"]["И"]
        total.append({"nick": nick, "club": fin[nick]["club"], "q": q, "games": games, "f": round(f, 2), "ik": round(q * 0.6 + f * 0.4, 3)})
    total.sort(key=lambda r: -r["ik"])
    assert [r["nick"] for r in total[:3]] == ["Дин", "Franklin", "Ятна"], total[:3]
    cols = ["№", "Игрок", "ИК", "Отбор", "Игр в отборе", "Финал"]
    summary = {
        "title": "Итоговая таблица",
        "note": "ИК = 0,6 × коэффициент отбора + 0,4 × коэффициент финала (баллы финала на 10 игр). Пересчитано по данным клуба; места совпадают с объявленными: 1. Дин, 2. Франклин, 3. Ятна.",
        "columns": cols,
        "rows": [{"place": i + 1, "nick": r["nick"], "club": r["club"], "penalty": None, "seat": None, "total": r["ik"],
                  "values": {"ИК": r["ik"], "Отбор": r["q"], "Игр в отборе": r["games"], "Финал": r["f"]}} for i, r in enumerate(total)],
    }
    stages = [summary, final] + [legacy_stage(pid, f"{i + 1} серия")[0] for i, pid in enumerate(series)]
    return {
        "key": "232", "fiim_id": 232, "url": legacy_url(31), "date": "2017-05-27", "name": "Mafia Champions League 2016/2017",
        "city": "Харьков", "kind": "personal", "ours": True, "project": True,
        "source": "старый mafiacl.com (веб-архив) и посты группы Mafia Champions League во ВКонтакте",
        "legend": {**legend, "ИК": "итоговый коэффициент", "Отбор": "средний коэффициент за серии отбора (баллы за 10 игр)", "Финал": "баллы финальной серии в пересчёте на 10 игр"},
        "notes": ["Первый сезон лиги: 9 отборочных серий по 10 игр и финальная серия из 15 игр, всего 105 игр.",
                  "На сайте ФИИМ у этого турнира по ошибке стоит таблица MafiaCl Championship 2017, поэтому данные взяты со старого сайта клуба."],
        "stages": stages,
    }


def legacy_extra(key, name, date, city, pages, ours=True, notes=None):
    stages, legend = [], {}
    for pid, title in pages:
        st, lg = legacy_stage(pid, title)
        stages.append(st)
        legend.update(lg)
    return {"key": key, "fiim_id": None, "url": legacy_url(pages[0][0]), "date": date, "name": name, "city": city, "kind": "personal",
            "ours": ours, "project": True, "source": "старый mafiacl.com (веб-архив)", "legend": legend, "stages": stages,
            "approx_date": True, "notes": notes or []}


def manual_2013():
    """MafiaCl Championship 2013 — не на ФИИМ, итоги со скриншотов ВКонтакте (data/fiim/mafiacl-championship-2013.json)."""
    m = json.load(open("data/fiim/mafiacl-championship-2013.json", encoding="utf8"))
    final_cols = ["Б", "1", "2", "3", "4", "5", "П"]
    return {
        "key": "mafiacl-championship-2013",
        "fiim_id": None,
        "url": None,
        "date": m["date"],
        "name": m["name"],
        "city": m["city"],
        "kind": "personal",
        "ours": True,
        "project": True,
        "source": m["source"],
        "legend": {"Б": "баллы", "П": "количество побед", "1–5": "баллы за игры финала"},
        "notes": m["notes"],
        "stages": [
            {
                "title": "Финал",
                "note": None,
                "columns": ["№", "Игрок"] + final_cols,
                "rows": [
                    {"place": r["place"], "nick": r["nick"], "club": None, "penalty": None, "seat": None, "total": r["points"],
                     "values": dict(zip(final_cols, [r["points"], *r["games"], r["wins"]]))}
                    for r in m["final"]
                ],
            },
            {
                "title": "Отборочные игры",
                "note": None,
                "columns": ["№", "Игрок", "Б", "П"],
                "rows": [
                    {"place": r["place"], "nick": r["nick"], "club": None, "penalty": None, "seat": None, "total": r["points"],
                     "values": {"Б": r["points"], "П": r["wins"]}}
                    for r in m["qualifying"]
                ],
            },
        ],
    }


def bundle():
    """Всё для сайта одним файлом: src/content/fiim/archive.json (только турниры клуба и серии его лиг)."""
    items = [
        manual_2013(),
        legacy_extra("maf-marathon-2016", "Маф-марафон 2016", "2016-12-01", "Харьков", [(9, "Личный зачёт")],
                     notes=["Парный турнир на 24 часа, 27 игр. Победители в парном зачёте — Хохольчик и Марта."]),
        legacy_extra("maf-marathon-2017", "Маф-марафон 2017", "2017-12-01", "Харьков", [(35, "Личный зачёт")],
                     notes=["Парный турнир: 27 игр за 25 часов. Парный зачёт: 1. Анархия и Lynch, 2. Бенджамин и Ginger, 3. YeS и Морф."]),
        legacy_extra("mafiacl-kharkiv-cup-2017", "MafiaCl Kharkiv Cup 2017", "2017-06-01", "Харьков", [(34, "Итоги")],
                     notes=["Турнир к 5-летию клуба. Парный зачёт — Борщ и Snow."]),
    ]
    for t in json.load(open("data/fiim/tournaments.json", encoding="utf8"))["tournaments"]:
        if not t.get("fiim_id") or not (t["ours"] or t["project"]):
            continue
        if t.get("held") is False:
            continue
        p = f"{OUT}/{t['fiim_id']}.json"
        if not os.path.exists(p):
            continue
        d = json.load(open(p, encoding="utf8"))
        d["key"] = str(t["fiim_id"])
        if t["fiim_id"] == 688:  # на ФИИМ главная таблица — только финальные игры; места сезона — по ИК (данные клуба)
            d["podium"] = ["Кира", "Экстрасенс", "Шершень"]
            d["notes"] = ["Итоговые места сезона (по итоговому коэффициенту с учётом отбора): 1. Кира, 2. Экстрасенс, 3. Шершень. Призовой фонд 10 000 грн, 116 игр за сезон. Ниже — таблицы ФИИМ отдельно по финальным и квалификационным играм."]
        if t["fiim_id"] == 232:
            items.append(mcl_2016_2017())
            continue
        if t["fiim_id"] == 147:  # Mafia Stars 2016: туры и полуфинал со старого сайта
            for pid, title in [(5, "Финал (старый сайт клуба)"), (4, "Полуфинал"), (3, "Тур 3"), (2, "Тур 2"), (1, "Тур 1")]:
                st, lg = legacy_stage(pid, title)
                d["stages"].append(st)
                d["legend"] = {**lg, **d["legend"]}
        if t["fiim_id"] == 231:  # Mafia Stars 2017: отбор и полуфиналы со старого сайта (финала там нет)
            for pid, title in [(24, "Полуфинал 2"), (22, "Полуфинал 1"), (21, "Отборочный тур")]:
                st, lg = legacy_stage(pid, title)
                d["stages"].append(st)
                d["legend"] = {**lg, **d["legend"]}
        if t.get("results_wrong"):
            d["stages"] = []
            d["notes"] = [t["note"]]
        d["source"] = "fiim.world"
        for s in d["stages"]:
            s["title"] = re.sub(r"\s+", " ", s["title"]).strip()
        # Сверху главное: итоговая таблица, финал, полуфинал, дальше отбор и серии в порядке страницы ФИИМ.
        def rank(st):
            t = st["title"].lower()
            if "итогов" in t or t.startswith("рейтинг") or "текущий рейтинг" in t:
                return 0
            if re.search(r"финал|final", t) and "полуфинал" not in t:
                return 1
            if "полуфинал" in t:
                return 2
            return 3
        d["stages"].sort(key=rank)
        items.append(d)
    items.sort(key=lambda x: x["date"])
    os.makedirs("src/content/fiim", exist_ok=True)
    json.dump(items, open("src/content/fiim/archive.json", "w", encoding="utf8"), ensure_ascii=False, separators=(",", ":"))

    # Короткий список для страниц-списков (без таблиц): кто чей этап, призёры.
    def base(name):
        return re.sub(r"\s+", " ", name).strip().lower()

    index = []
    for x in items:
        parent = next(
            (p["key"] for p in items if p is not x and base(x["name"]).startswith(base(p["name"]) + " ".strip()) and len(p["name"]) < len(x["name"])
             and base(x["name"])[len(base(p["name"]))] in " .,(-" and p["date"] >= x["date"]),
            None,
        )
        stage = bool(parent) or bool(re.search(r"серия|series|полуфинал|ВК|конференц", x["name"], re.I))
        main = next((st for st in x["stages"] if re.search(r"итогов", st["title"], re.I)), None) or next(
            (st for st in x["stages"] if re.search(r"финал|final", st["title"], re.I) and not re.search(r"полуфинал", st["title"], re.I)), None
        ) or (x["stages"][0] if x["stages"] else None)
        top = x.get("podium") or [r["nick"] for r in sorted(main["rows"], key=lambda r: (r["place"] if isinstance(r["place"], int) else 999))[:3]] if main else []
        index.append({k: x[k] for k in ("key", "name", "date", "city", "ours", "project")} | {"approx_date": bool(x.get("approx_date")), "parent": parent, "stage": stage, "top": top, "players": len({r["nick"] for st in x["stages"] for r in st["rows"]})})
    json.dump(index, open("src/content/fiim/index.json", "w", encoding="utf8"), ensure_ascii=False, indent=0)
    print(f"src/content/fiim/archive.json: {len(items)} турниров")
    for i in index:
        print(f"  {i['date']} {'наш ' if i['ours'] else 'лига'} {'этап' if i['stage'] else 'ГЛАВ'} {i['name'][:50]:50} ← {i['parent']} {i['top']}")


if __name__ == "__main__":
    bundle()
