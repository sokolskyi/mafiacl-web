import type { LegalText } from "../types";

const text: LegalText = {
  title: "Obchodní podmínky",
  lead: "Podmínky nákupu zboží a permanentek v obchodě MafiaCL Prague na mafiacl.com.",
  sections: [
    {
      id: "prodavajici",
      title: "Prodávající",
      items: [
        "Prodávajícím je {name}, IČO {ico}, místo podnikání {address}, fyzická osoba podnikající zapsaná v živnostenském rejstříku (Úřad městské části Praha 9). Prodávající není plátcem DPH.",
        "Kontakt: e-mail {email}, telefon {phone}. Osobně na klubových hrách podle rozpisu na webu.",
        "Dozor nad dodržováním práv spotřebitelů vykonává Česká obchodní inspekce, coi.gov.cz.",
        "Podmínky upravují vztah mezi prodávajícím a kupujícím. Je-li kupující spotřebitel, má práva podle občanského zákoníku (zákon č. 89/2012 Sb.) a zákona o ochraně spotřebitele, která tyto podmínky nemohou omezit.",
      ],
    },
    {
      id: "nabidka",
      title: "Zboží a ceny",
      items: [
        "V obchodě prodáváme klubové zboží (například oblečení, hrnky, masky, dárkové poukazy) a permanentky na klubové hry.",
        "U zboží je uveden popis, varianty a cena. Ceny jsou konečné v korunách českých. Prodávající není plátcem DPH, proto cena DPH neobsahuje. Zboží se nezasílá, proto se neplatí žádné poštovné.",
        "U některých permanentek se cena mění podle data nákupu. Platí cena uvedená v okamžiku odeslání objednávky.",
      ],
    },
    {
      id: "objednavka",
      title: "Objednávka a uzavření smlouvy",
      items: [
        "K objednávce je potřeba účet na webu. Zboží vložíte do košíku, zkontrolujete obsah, cenu a údaje (přezdívka a barva u zboží s potiskem, začátek platnosti u permanentky) a objednávku odešlete tlačítkem „Objednávka zavazující k platbě“.",
        "Odesláním objednávky je kupní smlouva uzavřena. Potvrzení a stav objednávky najdete v účtu v části Objednávky. Chyby před odesláním opravíte v košíku.",
        "Před dokončením objednávky se seznámíte s těmito podmínkami. Jejich aktuální znění si můžete kdykoli uložit nebo vytisknout z této stránky.",
        "Objednávku, která není zaplacena do 48 hodin, systém automaticky zruší. Nezaplacenou objednávku můžete zrušit i sami.",
      ],
    },
    {
      id: "platba",
      title: "Platba",
      items: [
        "Objednávku zaplatíte v klubu na hře hotově, kartou nebo převodem. Platbu u objednávky označí obsluha klubu.",
        "Jakmile bude dostupná online platba kartou přes platební bránu, můžete platit i přímo na webu. Údaje o kartě zadáváte jen do platební brány, prodávající je nevidí.",
        "Část ceny můžete uhradit body Respect podle kurzu uvedeného na webu. Při zrušení objednávky nebo odstoupení od smlouvy se použité body vrátí do účtu.",
        "Doklad o zaplacení vám vystavíme.",
      ],
    },
    {
      id: "prevzeti",
      title: "Převzetí zboží",
      items: [
        "Zaplacené zboží si vyzvednete osobně v klubu na některé z nejbližších her. Zboží nezasíláme.",
        "Zboží skladem je připraveno na nejbližší hře po zaplacení. Zboží vyráběné na zakázku (například s potiskem přezdívky) nejpozději do 30 dnů od zaplacení, není-li u zboží uvedeno jinak. O případném zpoždění vás informujeme.",
        "Nebezpečí škody na zboží přechází na kupujícího převzetím.",
      ],
    },
    {
      id: "permanentky",
      title: "Permanentky",
      items: [
        "Permanentka je předplatné na klubové hry v době platnosti. Které hry zahrnuje, jak dlouho platí a jaké výhody dává (například přednostní přihlášku), je uvedeno v popisu permanentky.",
        "Platnost začíná zvoleným dnem, nebo hned po zaplacení, pokud jste žádné datum nezvolili. Permanentka je osobní a nelze ji převést na jinou osobu.",
        "Turnaje s vlastním startovným permanentka nezahrnuje, není-li v popisu uvedeno jinak. Nevyužité hry v době platnosti se nenahrazují ani nevracejí, s výjimkou případů, kdy hru zruší klub.",
      ],
    },
    {
      id: "odstoupeni",
      title: "Odstoupení od smlouvy",
      items: [
        "Spotřebitel může od smlouvy odstoupit bez udání důvodu do 14 dnů. U zboží lhůta běží od převzetí, u permanentky od uzavření smlouvy.",
        "Odstoupení nám oznamte jakýmkoli jednoznačným prohlášením, například e-mailem na {email}. Můžete použít vzorový formulář níže, ale není to povinné. Lhůta je zachována, pokud prohlášení odešlete před jejím uplynutím.",
        "Zboží vraťte do 14 dnů od odstoupení osobně v klubu. Zboží by mělo být nepoškozené a nepoužívané nad rámec běžného vyzkoušení. Za snížení hodnoty zboží v důsledku jiného zacházení můžeme požadovat náhradu.",
        "Peníze vrátíme do 14 dnů od odstoupení stejným způsobem, jakým jste platili, nebo jinak po dohodě. U zboží nejdříve poté, co nám ho vrátíte.",
        "Pokud jste požádali, aby permanentka začala platit už během lhůty pro odstoupení, a pak odstoupíte, vrátíme cenu sníženou o poměrnou část za dobu do odstoupení.",
        "Od smlouvy nelze odstoupit u zboží upraveného podle vašeho přání (například s potiskem vaší přezdívky) ani u zboží v uzavřeném obalu, které z hygienických důvodů nelze vrátit, pokud jste obal porušili.",
      ],
    },
    {
      id: "vady",
      title: "Vady zboží a reklamace",
      items: [
        "Odpovídáme za to, že zboží při převzetí nemá vady. Spotřebitel může vadu uplatnit do 24 měsíců od převzetí.",
        "Reklamaci uplatníte osobně v klubu nebo e-mailem na {email}. Uveďte číslo objednávky a popis vady, ideálně s fotografií.",
        "Můžete požadovat opravu nebo výměnu, a není-li to možné, přiměřenou slevu nebo u podstatné vady odstoupit od smlouvy. Reklamaci vyřídíme a o výsledku vás informujeme do 30 dnů od uplatnění, pokud se nedohodneme na delší lhůtě.",
        "Záruka se nevztahuje na běžné opotřebení a na vady způsobené nesprávným používáním.",
      ],
    },
    {
      id: "stiznosti",
      title: "Stížnosti a mimosoudní řešení sporů",
      items: [
        "Stížnosti posílejte na {email}. Odpovíme bez zbytečného odkladu.",
        "Spotřebitel má právo na mimosoudní řešení sporu. Příslušným subjektem je Česká obchodní inspekce, oddělení ADR, Gorazdova 1969/24, 120 00 Praha 2, adr.coi.gov.cz.",
      ],
    },
    {
      id: "zaver",
      title: "Závěrečná ustanovení",
      items: [
        "Osobní údaje zpracováváme podle zásad ochrany osobních údajů.",
        "Smlouva se řídí právem České republiky. Podmínky jsou k dispozici v češtině, ruštině, ukrajinštině a angličtině. Při rozporu má přednost česká verze.",
        "Podmínky můžeme změnit. Pro objednávku platí znění účinné v okamžiku jejího odeslání.",
        "Toto znění je účinné od {effective}.",
      ],
    },
    {
      id: "vzor",
      title: "Vzorový formulář pro odstoupení od smlouvy",
      items: [
        "Adresát: {name}, {address}, e-mail {email}.",
        "Oznamuji, že tímto odstupuji od smlouvy o nákupu tohoto zboží / této permanentky: ______",
        "Číslo objednávky: ______ · Datum objednání / převzetí: ______",
        "Jméno a příjmení: ______ · E-mail nebo adresa: ______",
        "Datum a podpis (jen u listinné podoby): ______",
      ],
    },
  ],
};

export default text;
