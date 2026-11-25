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
    items = [manual_2013()]
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
        if t.get("results_wrong"):
            d["stages"] = []
            d["notes"] = [t["note"]]
        d["source"] = "fiim.world"
        for s in d["stages"]:
            s["title"] = re.sub(r"\s+", " ", s["title"]).strip()
        # Сверху главное: итоговая таблица, финал, полуфинал, дальше отбор и серии в порядке страницы ФИИМ.
        def rank(st):
            t = st["title"].lower()
            if "итогов" in t:
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
        top = [r["nick"] for r in sorted(main["rows"], key=lambda r: (r["place"] if isinstance(r["place"], int) else 999))[:3]] if main else []
        index.append({k: x[k] for k in ("key", "name", "date", "city", "ours", "project")} | {"parent": parent, "stage": stage, "top": top, "players": len({r["nick"] for st in x["stages"] for r in st["rows"]})})
    json.dump(index, open("src/content/fiim/index.json", "w", encoding="utf8"), ensure_ascii=False, indent=0)
    print(f"src/content/fiim/archive.json: {len(items)} турниров")
    for i in index:
        print(f"  {i['date']} {'наш ' if i['ours'] else 'лига'} {'этап' if i['stage'] else 'ГЛАВ'} {i['name'][:50]:50} ← {i['parent']} {i['top']}")


if __name__ == "__main__":
    bundle()
