import type { LegalText } from "../types";

const text: LegalText = {
  title: "Podmínky užívání webu",
  lead: "Pravidla pro účet na mafiacl.com: registrace, přezdívka, přihlášky na hry, obsah, program Respect a odpovědnost.",
  sections: [
    {
      id: "uvod",
      title: "Úvodní ustanovení",
      items: [
        "Web mafiacl.com provozuje {name}, IČO {ico}, místo podnikání {address} (dále „klub“ nebo „my“). Kontakt: {email}, telefon {phone}.",
        "Registrací účtu s těmito podmínkami souhlasíte a uzavíráte s námi smlouvu o užívání webu. Užívání webu a účtu je bezplatné.",
        "Nákup zboží a permanentek se řídí samostatnými obchodními podmínkami. Jak zpracováváme osobní údaje, popisují zásady ochrany osobních údajů.",
      ],
    },
    {
      id: "ucet",
      title: "Účet a ověření",
      items: [
        "Účet si může založit osoba starší 15 let. Každý může mít jen jeden účet. K jednomu účtu můžete připojit více způsobů přihlášení.",
        "Údaje v účtu, zejména datum narození, musí být pravdivé. Datum narození lze později změnit jen se souhlasem administrace klubu.",
        "Nový účet ověřuje administrace klubu. Po schválení dostanete stálé členské číslo a můžete se přihlašovat na hry. Stránka hráče a žebříčky fungují i před schválením. Administrace může registraci odmítnout, například při podezření na duplicitní nebo falešný účet.",
        "Klub odsuzuje agresi Ruska proti Ukrajině. Osoby s bydlištěm v Rusku nebo Bělorusku se na webu registrovat nemohou.",
        "Přihlašovací údaje chraňte. Za činnost ve svém účtu odpovídáte. Podezření na zneužití účtu nám hned oznamte.",
      ],
    },
    {
      id: "prezdivka",
      title: "Herní přezdívka",
      items: [
        "Přezdívka se zobrazuje veřejně v žebříčcích, výsledcích a přihláškách. Musí být jedinečná a nesmí být urážlivá, vulgární ani se vydávat za jinou osobu nebo organizaci.",
        "Přezdívku lze změnit jednou za rok. Častěji jen se souhlasem administrace klubu. Dřívější přezdívky může administrace propojit s účtem, aby se k němu započítaly starší výsledky.",
        "Nevhodnou přezdívku může administrace změnit.",
      ],
    },
    {
      id: "hry",
      title: "Přihlášky na hry",
      items: [
        "Na hry se přihlašujete podle rozpisu na webu. Počet míst, pravidla fronty, přednost držitelů permanentek a list čekatelů jsou popsány u konkrétní hry.",
        "Pokud nemůžete přijít, přihlášku co nejdříve zrušte, aby se místo uvolnilo dalším. Opakované nepřijití bez omluvy může vést k omezení přihlašování.",
        "Klub může hru zrušit nebo přesunout, například při nízkém počtu hráčů. Přihlášené o tom informujeme.",
        "Na hrách platí Kodex klubu a pravidla hry, podle kterých se hra hraje.",
      ],
    },
    {
      id: "chovani",
      title: "Chování a zákazy",
      items: [
        "Na webu ani na hrách není dovoleno urážet, vyhrožovat, diskriminovat, podvádět, zneužívat chyby webu, zakládat falešné účty nebo obcházet omezení.",
        "Při porušení pravidel může administrace upozornit, dočasně nebo trvale zakázat účast na hrách, omezit funkce účtu nebo účet zrušit. Zákazy účasti mohou být zveřejněny v seznamu zákazů klubu.",
      ],
    },
    {
      id: "obsah",
      title: "Obsah od hráčů",
      items: [
        "Články, fotografie a další obsah, který na web nahrajete, musí být vaše vlastní nebo k nim musíte mít práva. Nesmí porušovat zákon ani práva jiných osob.",
        "Nahráním obsahu nám udělujete bezplatnou, nevýhradní licenci zveřejnit ho na webu a v kanálech klubu, a to i v upravené podobě (například zkrácení nebo oříznutí fotografie), po dobu jeho zveřejnění. Autorská práva vám zůstávají.",
        "Články před zveřejněním schvaluje administrace. Obsah, který porušuje tyto podmínky, můžeme odmítnout nebo odstranit.",
      ],
    },
    {
      id: "vysledky",
      title: "Výsledky, fotografie a vysílání",
      items: [
        "Výsledky partií, statistiky, hodnocení, tituly a výhry jsou veřejné a jsou součástí sportovní historie klubu.",
        "Na hrách se fotografuje a některé stoly se vysílají a nahrávají. Pokud natáčeni být nechcete, řekněte to před hrou moderátorovi.",
      ],
    },
    {
      id: "respect",
      title: "Věrnostní program Respect",
      items: [
        "Respect jsou body věrnostního programu klubu. Získáváte je za aktivity popsané na stránce Respect, například za odehrané hry, série večerů, nákup permanentky, narozeniny nebo schválený článek, a také uplatněním kódu z fyzické mince klubu.",
        "Respect můžete použít k úhradě klubových večerů, permanentek a zboží podle kurzu uvedeného na webu. Nemají peněžní hodnotu, nelze je vyměnit za peníze, převést na jiný účet ani zdědit.",
        "Kód z mince lze uplatnit jen jednou. Body připsané omylem nebo získané zneužitím můžeme odebrat. Při zrušení objednávky se použité body vrátí.",
        "Pravidla programu můžeme měnit. Změny oznámíme na webu předem. Již připsané body tím nezanikají. Při zrušení účtu body zanikají.",
      ],
    },
    {
      id: "odpovednost",
      title: "Dostupnost a odpovědnost",
      items: [
        "Web provozujeme, jak nejlépe umíme, ale nezaručujeme, že bude vždy dostupný a bez chyb. Údržba nebo výpadek služeb třetích stran může web dočasně omezit.",
        "Za obsah cizích webů, na které odkazujeme (například mafgame.org nebo YouTube), neodpovídáme.",
      ],
    },
    {
      id: "zruseni",
      title: "Zrušení účtu",
      items: [
        "Účet můžete kdykoli zrušit žádostí na {email}. Co se stane s vašimi údaji, popisují zásady ochrany osobních údajů.",
        "Při závažném nebo opakovaném porušení podmínek můžeme účet zrušit my.",
      ],
    },
    {
      id: "zaver",
      title: "Změny a závěrečná ustanovení",
      items: [
        "Podmínky můžeme změnit. Novou verzi zveřejníme na webu nejméně 14 dní před účinností. Pokud s ní nesouhlasíte, můžete účet zrušit. Dalším užíváním webu se změnou souhlasíte.",
        "Podmínky se řídí právem České republiky. Práva, která vám jako spotřebiteli dává zákon, tím nejsou dotčena.",
        "Podmínky jsou k dispozici v češtině, ruštině, ukrajinštině a angličtině. Při rozporu má přednost česká verze.",
        "Toto znění je účinné od {effective}.",
      ],
    },
  ],
};

export default text;
