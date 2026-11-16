import type { LegalText } from "../types";

const text: LegalText = {
  title: "Privacy Policy",
  lead: "What data MafiaCL Prague processes about you, why, for how long, and what your rights are.",
  sections: [
    {
      id: "spravce",
      title: "Who processes your data",
      items: [
        "The data controller is {name}, company ID (IČO) {ico}, registered business address {address}, a self-employed person entered in the Czech Trade Register (Úřad městské části Praha 9). He runs the MafiaCL Prague club and the mafiacl.com website.",
        "Contact for anything related to personal data: e-mail {email}, phone {phone}. We have not appointed a data protection officer because we are not required to.",
        "This policy follows Regulation (EU) 2016/679 (GDPR) and Czech Act No. 110/2019 Coll. on personal data processing.",
      ],
    },
    {
      id: "udaje",
      title: "What data we process",
      items: [
        "Account: your e-mail and the identifier of the service you sign in with (Google, Facebook, Telegram, Microsoft, Apple or an e-mail code), your name and profile photo from that service, game nickname, photo, city, links to your profiles on other game sites, and site language.",
        "Date of birth — required. We use it to check that you are at least 15 and for the birthday gift in the Respect programme. It is never shown publicly.",
        "Your phone number, if you enter it, and your Telegram chat ID, if you connect the club bot.",
        "Member number and account verification status. At registration we store the code of the country you sign in from (based on your IP address). We do not store the IP address itself.",
        "Games: sign-ups, queue and waiting-list position, attendance, game results from the electronic score sheet (role, result, points, fouls, best move, votes), ratings, titles and prize money.",
        "Purchases and payments: orders, memberships, payments and payment method, Respect point transactions.",
        "Content you create: blog articles, photos for them, feedback for the club administration.",
        "Corporate event and franchise enquiries: name, company, contact, city, date and event details. To prevent spam we store a fingerprint (hash) of your IP address, not the address itself.",
        "Bans from club games, including the reason.",
        "Photos and video from games: club games are photographed, and some tables are streamed and recorded (YouTube, Twitch).",
        "Technical data: essential cookies (see section 9) and server logs kept by our hosting provider (IP address, time, page address), stored briefly to run and secure the site.",
      ],
    },
    {
      id: "ucely",
      title: "Why we process data and on what legal basis",
      items: [
        "Running your account, game sign-ups, priority sign-up for membership holders, statistics, ratings and the Respect programme — performance of a contract, namely the Terms of Use (Art. 6(1)(b) GDPR).",
        "Selling goods and memberships, payments and receipts — performance of a contract and compliance with accounting and tax law (Art. 6(1)(b) and (c) GDPR).",
        "Age and new-player verification, bans, protection against abuse and spam, and the registration country check under club rules — our legitimate interest in running the club safely and fairly (Art. 6(1)(f) GDPR).",
        "Public results, ratings, hall of fame, ban list and club archive — our legitimate interest in keeping the club's sporting history. These are shown under your game nickname.",
        "Photos and streams of games — our legitimate interest in promoting the club. If you don't want to be filmed, tell the host before the game and we will try to accommodate you (for example, a table without a camera). You can ask us to edit or remove a specific photo or recording.",
        "Telegram notifications — your consent, given by connecting the bot. You can disconnect the bot at any time.",
        "Replying to enquiries — steps taken before entering into a contract (Art. 6(1)(b) GDPR).",
        "We do not send marketing e-mails or newsletters.",
      ],
    },
    {
      id: "kdo-vidi",
      title: "Who sees your data",
      items: [
        "Publicly on the site: nickname, profile photo, city, links to game profiles, statistics and results, titles, prize money and approved articles. Your e-mail, phone, date of birth and registration country are never shown publicly.",
        "Club administrators and hosts see sign-ups, attendance and the data needed to run games. Date of birth, registration country and payments are visible to administrators only.",
        "Processors that run the site for us: Supabase (database and files, servers in the EU — Paris), Vercel (website hosting, servers in the EU — Paris), Cloudflare (DNS, Turnstile bot protection, e-mail), Resend (sending sign-in code e-mails), Telegram (club bot, only if you connect it). Once online payments launch, also the GoPay payment gateway, and iDoklad for receipts.",
        "Sign-in services (Google, Meta, Telegram, Microsoft, Apple) are independent controllers of the data you give them when signing in, under their own policies.",
        "Videos on the site are links to YouTube. Video thumbnails load from Google servers, so Google sees your IP address.",
        "We do not sell your data or pass it to anyone else unless the law requires it.",
      ],
    },
    {
      id: "mimo-eu",
      title: "Transfers outside the EU",
      items: [
        "Some processors (Vercel, Supabase, Cloudflare, Resend) are US companies. Data is transferred under the EU–US Data Privacy Framework or the European Commission's standard contractual clauses.",
      ],
    },
    {
      id: "doba",
      title: "How long we keep data",
      items: [
        "Account and profile data for as long as the account exists. After you delete the account, we delete your profile, contacts and date of birth within 30 days.",
        "Game results, ratings and the club archive remain under your game nickname after account deletion as part of the club's sporting history. On request we replace the nickname with a neutral label.",
        "Sales and payment records for as long as accounting and tax rules require (usually 10 years).",
        "Corporate and franchise enquiries for 2 years after the last contact.",
        "Bans for as long as they apply.",
        "Server logs and technical data at our providers, usually no longer than 30 days.",
      ],
    },
    {
      id: "vek",
      title: "Age",
      items: [
        "You must be at least 15 to create an account. Younger players can play together with a parent or another adult but do not create an account on the site.",
      ],
    },
    {
      id: "prava",
      title: "Your rights",
      items: [
        "You have the right to access, correct and erase your data, to restrict processing and to data portability.",
        "You can object to processing based on legitimate interest (for example, publishing results or photos). You can withdraw consent (Telegram) at any time.",
        "You can change most data yourself in your account. For anything else, write to {email}. We reply within one month.",
        "You have the right to lodge a complaint with the Czech Office for Personal Data Protection (Úřad pro ochranu osobních údajů), Pplk. Sochora 27, 170 00 Praha 7, www.uoou.gov.cz.",
      ],
    },
    {
      id: "cookies",
      title: "Cookies",
      items: [
        "We only use cookies and browser storage the site cannot work without: signing in to your account (sb-… cookies), your chosen language (NEXT_LOCALE), Cloudflare Turnstile bot protection when signing in by e-mail, and your shopping cart (browser local storage, mafiacl-cart).",
        "We use no analytics or advertising cookies, so we don't ask for cookie consent. If we ever add such tools, we will ask for your consent first.",
        "You can delete or block cookies in your browser settings, but you won't be able to sign in without the essential ones.",
      ],
    },
    {
      id: "zmeny",
      title: "Changes to this policy",
      items: [
        "We may update this policy, for example when we add a new service. The current version is always on this page, and we announce significant changes on the site.",
        "This version is effective from {effective}.",
      ],
    },
  ],
};

export default text;
