import type { LegalText } from "../types";

const text: LegalText = {
  title: "Zásady ochrany osobních údajů",
  lead: "Jaké údaje o vás klub MafiaCL Prague zpracovává, proč, jak dlouho a jaká máte práva.",
  sections: [
    {
      id: "spravce",
      title: "Kdo údaje zpracovává",
      items: [
        "Správcem osobních údajů je {name}, IČO {ico}, místo podnikání {address}, fyzická osoba podnikající zapsaná v živnostenském rejstříku (Úřad městské části Praha 9). Provozuje klub MafiaCL Prague a web mafiacl.com.",
        "Kontakt pro vše, co se týká osobních údajů: e-mail {email}, telefon {phone}. Pověřence pro ochranu osobních údajů jsme nejmenovali, protože nám tato povinnost nevzniká.",
        "Tyto zásady se řídí nařízením (EU) 2016/679 (GDPR) a zákonem č. 110/2019 Sb., o zpracování osobních údajů.",
      ],
    },
    {
      id: "udaje",
      title: "Jaké údaje zpracováváme",
      items: [
        "Účet: e-mail a identifikátor od služby, přes kterou se přihlašujete (Google, Facebook, Telegram, Microsoft, Apple nebo kód na e-mail), jméno a profilová fotografie od této služby, herní přezdívka, fotografie, město, odkazy na vaše profily na jiných herních webech a jazyk webu.",
        "Datum narození — je povinné. Slouží k ověření, že je vám alespoň 15 let, a k narozeninovému dárku v programu Respect. Veřejně se nezobrazuje.",
        "Telefon, pokud ho vyplníte, a identifikátor chatu Telegram, pokud propojíte klubového bota.",
        "Členské číslo a stav ověření účtu. Při registraci si uložíme kód země, ze které se přihlašujete (podle IP adresy). Samotnou IP adresu neukládáme.",
        "Hry: přihlášky na hry, pořadí ve frontě a na listu čekatelů, účast, výsledky partií z elektronického protokolu (role, výsledek, body, fauly, nejlepší tah, hlasování), hodnocení, tituly a výhry.",
        "Nákupy a platby: objednávky, permanentky, platby a způsob platby, pohyby bodů Respect.",
        "Obsah, který vytvoříte: články do blogu, fotografie k nim, zpětná vazba pro administraci klubu.",
        "Poptávky firemních akcí a franšízy: jméno, firma, kontakt, město, termín a podrobnosti akce. Proti spamu ukládáme otisk (hash) IP adresy, ne IP adresu samotnou.",
        "Zákazy účasti (bany) včetně důvodu.",
        "Fotografie a video ze her: klubové hry fotografujeme a některé stoly vysíláme a nahráváme (YouTube, Twitch).",
        "Technické údaje: nezbytné cookies (viz bod 9) a záznamy serveru u poskytovatele hostingu (IP adresa, čas, adresa stránky), které se uchovávají krátce a slouží k provozu a zabezpečení webu.",
      ],
    },
    {
      id: "ucely",
      title: "Proč údaje zpracováváme a na jakém základě",
      items: [
        "Vedení účtu, přihlášky na hry, prioritní přihlášky pro držitele permanentek, statistiky, hodnocení a program Respect — plnění smlouvy, tedy podmínek užívání webu (čl. 6 odst. 1 písm. b GDPR).",
        "Prodej zboží a permanentek, platby a doklady — plnění smlouvy a splnění právních povinností podle účetních a daňových předpisů (čl. 6 odst. 1 písm. b a c GDPR).",
        "Ověření věku a ověření nových hráčů, zákazy účasti, ochrana před zneužitím a spamem, zjištění země registrace podle pravidel klubu — oprávněný zájem na bezpečném a férovém provozu klubu (čl. 6 odst. 1 písm. f GDPR).",
        "Veřejné výsledky, žebříčky, síň slávy, seznam zákazů a archiv klubu — oprávněný zájem na vedení sportovní historie klubu. Zobrazujeme je pod herní přezdívkou.",
        "Fotografie a vysílání her — oprávněný zájem na prezentaci klubu. Pokud natáčeni být nechcete, řekněte to před hrou moderátorovi a pokusíme se vám vyhovět (například stůl bez kamery). O úpravu nebo odstranění konkrétní fotografie či záznamu nás můžete požádat.",
        "Upozornění přes Telegram — váš souhlas, který dáváte propojením bota. Bota můžete kdykoli odpojit.",
        "Odpovědi na poptávky — jednání o uzavření smlouvy (čl. 6 odst. 1 písm. b GDPR).",
        "Reklamní e-maily ani newslettery neposíláme.",
      ],
    },
    {
      id: "kdo-vidi",
      title: "Kdo vaše údaje vidí",
      items: [
        "Veřejně na webu: přezdívka, profilová fotografie, město, odkazy na herní profily, statistiky a výsledky, tituly, výhry a schválené články. E-mail, telefon, datum narození a zemi registrace veřejně nezobrazujeme.",
        "Administrace a moderátoři klubu vidí přihlášky, účast a údaje potřebné k vedení her. Datum narození, zemi registrace a platby vidí jen administrace.",
        "Zpracovatelé, kteří pro nás zajišťují provoz: Supabase (databáze a soubory, servery v EU — Paříž), Vercel (hosting webu, servery v EU — Paříž), Cloudflare (DNS, ochrana Turnstile proti robotům, e-mail), Resend (odesílání e-mailů s kódem pro přihlášení), Telegram (klubový bot, jen pokud ho propojíte). Po spuštění online plateb také platební brána GoPay a pro doklady účetní služba iDoklad.",
        "Služby pro přihlášení (Google, Meta, Telegram, Microsoft, Apple) jsou samostatnými správci údajů, které jim při přihlášení předáváte. Řídí se jejich vlastními zásadami.",
        "Videa na webu jsou odkazy na YouTube. Náhledové obrázky videí se načítají ze serverů Google, který tak vidí vaši IP adresu.",
        "Údaje neprodáváme a nepředáváme nikomu dalšímu, pokud nám to neukládá zákon.",
      ],
    },
    {
      id: "mimo-eu",
      title: "Předávání mimo EU",
      items: [
        "Někteří zpracovatelé (Vercel, Supabase, Cloudflare, Resend) jsou společnosti z USA. Údaje se předávají podle rámce EU–USA pro ochranu osobních údajů (Data Privacy Framework) nebo podle standardních smluvních doložek schválených Evropskou komisí.",
      ],
    },
    {
      id: "doba",
      title: "Jak dlouho údaje uchováváme",
      items: [
        "Účet a údaje profilu po dobu existence účtu. Po zrušení účtu smažeme profil, kontakty a datum narození do 30 dnů.",
        "Výsledky her, žebříčky a archiv klubu zůstávají i po zrušení účtu pod herní přezdívkou jako součást sportovní historie klubu. Na žádost přezdívku nahradíme neutrálním označením.",
        "Doklady o prodeji a platbách po dobu, kterou ukládají účetní a daňové předpisy (zpravidla 10 let).",
        "Poptávky firemních akcí a franšízy 2 roky od posledního kontaktu.",
        "Zákazy účasti po dobu jejich trvání.",
        "Záznamy serveru a technické údaje u poskytovatelů obvykle nejdéle 30 dnů.",
      ],
    },
    {
      id: "vek",
      title: "Věk",
      items: [
        "Účet si může založit osoba starší 15 let. Mladší hráči se mohou her účastnit s rodičem nebo jiným dospělým, účet na webu si ale nezakládají.",
      ],
    },
    {
      id: "prava",
      title: "Vaše práva",
      items: [
        "Máte právo na přístup ke svým údajům, jejich opravu, výmaz, omezení zpracování a přenositelnost.",
        "Proti zpracování na základě oprávněného zájmu (například zveřejnění výsledků nebo fotografií) můžete vznést námitku. Souhlas (Telegram) můžete kdykoli odvolat.",
        "Většinu údajů upravíte sami v osobním účtu. Ostatní žádosti pište na {email}. Odpovíme do jednoho měsíce.",
        "Máte právo podat stížnost u Úřadu pro ochranu osobních údajů, Pplk. Sochora 27, 170 00 Praha 7, www.uoou.gov.cz.",
      ],
    },
    {
      id: "cookies",
      title: "Cookies",
      items: [
        "Používáme jen cookies a úložiště prohlížeče, bez kterých web nefunguje: přihlášení k účtu (cookies sb-…), zvolený jazyk (NEXT_LOCALE), ochrana proti robotům Cloudflare Turnstile při přihlášení e-mailem a obsah košíku (místní úložiště prohlížeče, mafiacl-cart).",
        "Analytické ani reklamní cookies nepoužíváme, proto se na souhlas s cookies neptáme. Pokud bychom takové nástroje v budoucnu přidali, požádáme vás předem o souhlas.",
        "Cookies můžete smazat nebo zablokovat v nastavení prohlížeče. Bez nezbytných cookies se ale nepřihlásíte.",
      ],
    },
    {
      id: "zmeny",
      title: "Změny zásad",
      items: [
        "Zásady můžeme upravit, například když přidáme novou službu. Aktuální znění je vždy na této stránce, o podstatných změnách vás informujeme na webu.",
        "Toto znění je účinné od {effective}.",
      ],
    },
  ],
};

export default text;
