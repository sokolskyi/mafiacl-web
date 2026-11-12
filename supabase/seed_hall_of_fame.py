# Архив зала славы из группы VK (Харьков, 2012–2021). Формат: (год, категория, заголовок, сезон, [места], заметка)
S,T,M,A = "season","tournament","mini","achievement"
rows = [
 # Сезоны клуба (финалы)
 (2012,S,"I сезон","I",["RiT","Полицейский","Мирон Богданович"],"финал 16.12.2012"),
 (2013,S,"II сезон","II",["Вольфрам","RiT","Frank"],"финал 7.07.2013"),
 (2013,S,"III сезон","III",["Латвия","Кай","Мак"],None),
 (2014,S,"IV сезон","IV",["Персик","Сарказм","Дин"],"205 рейтинговых игр, 33 мини-турнира"),
 (2015,S,"V сезон","V",["Сарказм","Анархия","Trevery"],None),
 (2016,S,"VI сезон","VI",["Дин","Trevery","Борщ"],"финал 25.12.2016, 370 рейтинговых игр"),
 (2017,S,"VII сезон","VII",["Flash","Полицейский","Сарказм"],"финал 24.12.2017"),
 (2018,S,"VIII сезон","VIII",["Snow","Шершень","Спектр"],"финал 29.12.2018"),
 # Турниры клуба
 (2012,T,"Первый турнир MafiaCl Kharkiv",None,["Вольфрам","Кай","Монтана"],None),
 (2013,T,"MafiaCl Championship 2013",None,["RiT","Вольфрам","Бордо"],"12 побед в 12 играх"),
 (2013,T,"Турнир победителей мини-турниров",None,["Flash","Мила","RiT"],None),
 (2015,T,"Кубок Слобожанщины 2015",None,["Артист","Сарказм","Амахонда"],"60 участников, 16 городов"),
 (2016,T,"Кубок Слобожанщины 2016",None,["Кай","Сарказм","Анархия"],"60 участников, 13 городов"),
 (2016,T,"Mafia Stars 2016",None,["Борщ","Кика","Гармония"],None),
 (2017,T,"Кубок Слобожанщины 2017",None,["Сарказм","Полицейский","Вольфрам"],"80 участников; лучший шериф — Flash, лучший дон — Рыжая"),
 (2017,T,"Mafia Stars 2017",None,["RiT","Snow","Борщ"],None),
 (2017,T,"Mafia Champions League 2016/2017",None,["Дин","Франклин","Ятна"],None),
 (2017,T,"MafiaCl Championship 2017",None,["Анархия","Полицейский","Чикаго"],"5-й ежегодный турнир, 44 игры"),
 (2017,T,"MafiaCl Kharkiv Cup 2017",None,["Борщ"],"к 5-летию клуба"),
 (2017,T,"Зачётный день 2016/2017",None,["Бегедил","Шершень","Джина"],None),
 (2017,T,"Student league Summer Challenge 2017",None,["Бенджамин","Donc","Кельтас"],None),
 (2018,T,"Кубок Слобожанщины 2018",None,["22","Шершень","Марта"],"80 участников; лучший шериф — Амахонда, лучший дон — 22"),
 (2018,T,"Mafia Stars Ukraine 2018",None,["Flash","Valar Dohaeris","Дин"],None),
 (2018,T,"Mafia Champions League 2017/2018",None,["Бенджамин","Персик","Гармония"],None),
 (2018,T,"MafiaCl Kharkiv Cup 2018",None,["Гармония"],"к 6-летию клуба"),
 (2018,T,"Ukrainian Students Tournament 2018",None,["Полицейский","Констанция","Вольфрам"],None),
 (2018,T,"Student league Summer Challenge 2018",None,["Бенджамин","Cardinal","Змей"],None),
 (2019,T,"Mafia Stars Ukraine 2019",None,["Flash","Лев","Шершень"],None),
 (2019,T,"Ukrainian Students Tournament 2019",None,["Абрам","Амбал","Амахонда"],None),
 (2020,T,"Mafia Champions League 2019/2020",None,["Кира","Экстрасенс","Шершень"],None),
 (2021,T,"Mafia Champions League 2020/2021",None,["YeS"],"победитель финальной серии"),
 (2021,T,"Кубок Слобожанщины 2021",None,["Sailos","Хохольчик","Cardinal"],"40 участников; MVP — FD, лучший шериф — Flow, лучший дон — The Призрак"),
 (2021,T,"Mafia Stars Europe 2021",None,["Сова","Nancy","Valar Dohaeris"],"18 городов, 180–190 игроков, 266 игр; MVP — Valar Dohaeris"),
 (2021,T,"Турнир победителей мини-турниров",None,["Жонин","Don'Tright","Вряд ли"],None),
 # Студенческая лига (сезоны)
 (2014,T,"Student league I сезон",None,["Lina","Фандорин","Анархия"],None),
 (2015,T,"Student league II сезон",None,["Леди Бу","Добр","Локос"],None),
 (2016,T,"Student league III сезон",None,["Кай","Анархия","Морф"],None),
 (2017,T,"Student league IV сезон",None,["Snow","Эммануэль","Гармония"],None),
 (2018,T,"Student league V сезон",None,["Змей","Scorp","Донс"],None),
 (2021,T,"Student league VI сезон",None,["Змей","Osdorn","Don'Tright"],"финал 21.11.2021"),
 # Достижения игроков клуба
 (2012,A,"MafiaWorld Championship 2012",None,["YeS"],"10 побед из 11 игр"),
 (2013,A,"Чемпион мира по мафии (MWCH 2013)",None,["Кертис"],None),
 (2014,A,"Гроссмейстер ФИИМ",None,["YeS"],None),
 (2014,A,"Championship Seventh Street",None,["Кертис"],"1 место"),
 (2015,A,"Полуфинал чемпионата мира 2015",None,["YeS"],None),
 (2017,A,"Битва Чемпионов 2017",None,["Сарказм"],"1 место"),
 (2018,A,"Odessa Mafia Open 2018",None,["RiT"],"2 место"),
 (2019,A,"MAFIA HELP OPEN 2019",None,["Кукла"],"2 место"),
]
mini = {
 (2012,"I"): [("I","Луки"),("II","Кай"),("III","Полицейский"),("VII","Вольфрам"),("VIII","Локи"),("X","Кай"),("XI","Полицейский"),("XII","RiT"),("XIII","Полицейский"),("XIV","Шкода"),("XV","Кертис"),("XVI","Френк")],
 (2013,"II"): [("I","Frank"),("II","Френк"),("III","Дядюшка АУ"),("IV","Василий"),("V","Оливка"),("VII","Бордо"),("VIII","YeS"),("IX","Полицейский"),("X","Бордо"),("XI","Бордо"),("XII","Полицейский"),("XVII","Frank")],
 (2013,"III"): [("III","Кай"),("IV","Латвия"),("V","Мия"),("VI","Кай"),("VII","Мила"),("IX","RiT"),("X","Кай"),("XI","Мила"),("XII","Кай"),("XIII","Сарказм"),("XIV","Flash"),("XV","Оливка")],
 (2014,"IV"): [("I","Борщ"),("II","Шкода"),("III","Кертис"),("IV","Амбал"),("VIII","Бордо"),("IX","Борщ"),("X","Леди Бу"),("XI","Амахонда"),("XII","Леди Бу"),("XIII","Кастет"),("XIV","Кай"),("XVIII","Сарказм"),("XIX","Сарказм"),("XX","Леди Бу"),("XXI","МБ"),("XXII","Black"),("XXIV","Дин"),("XXV","Эммануэль"),("XXVI","Бордо"),("XXVII","Ятна"),("XXVIII","Дин"),("XXIX","Полицейский"),("XXXIII","Леди Бу")],
 (2015,"V"): [("III","Ятна"),("IV","КС"),("V","Ева"),("XXVIII","Полицейский")],
 (2016,"VI"): [("VII","Анархия"),("XI","Snow"),("XXIV","Кай"),("XXVI","Малыш"),("XXVIII","Хохольчик"),("XXXIV","Snow"),("XXXVI","Lynch"),("XLI","Trevery"),("XLII","Ятна"),("XLIII","Марта"),("XLIV","Shelby"),("XLVI","Snow")],
 (2021,"IX"): [("XXXII","Дор"),("XXXIII","Алиса"),("XXXIV","Агент"),("XXXV","Scorp"),("XLI","FloW"),("XLII","Prince"),("XLIII","Prince")],
}
def q(s): return "null" if s is None else "'" + s.replace("'","''") + "'"
def arr(a): return "array[" + ",".join(q(x) for x in a) + "]::text[]"
vals=[]; sort=0
for (y,c,title,season,places,note) in rows:
    sort+=1; vals.append(f"({y},'{c}',{q(title)},{q(season)},{arr(places)},{q(note)},{sort})")
for (y,season),items in mini.items():
    for (n,w) in items:
        sort+=1; vals.append(f"({y},'mini',{q(n)},{q(season)},{arr([w])},null,{sort})")
print("insert into public.hall_of_fame (club_id, city, year, category, title, season, places, note, sort)\nselect c.id, 'Харьков', v.* from public.clubs c, (values\n" + ",\n".join(vals) + "\n) as v(year, category, title, season, places, note, sort)\nwhere c.slug = 'mafiacl-prague';")
