import type { LegalText } from "../types";

const text: LegalText = {
  title: "Terms of Use",
  lead: "Rules for your account on mafiacl.com: registration, nickname, game sign-ups, content, the Respect programme and liability.",
  sections: [
    {
      id: "uvod",
      title: "Introduction",
      items: [
        "The mafiacl.com website is operated by {name}, company ID (IČO) {ico}, business address {address} (the “club”, “we”). Contact: {email}, phone {phone}.",
        "By registering an account you agree to these terms and enter into a contract with us for using the site. The site and the account are free of charge.",
        "Buying goods and memberships is governed by separate Terms of Sale. How we process personal data is described in the Privacy Policy.",
      ],
    },
    {
      id: "ucet",
      title: "Account and verification",
      items: [
        "You must be at least 15 to create an account. Each person may have only one account. You can link several sign-in methods to one account.",
        "The data in your account, especially your date of birth, must be true. You can change your date of birth later only with the club administration's approval.",
        "New accounts are verified by the club administration. Once approved, you get a permanent member number and can sign up for games. Your player page and ratings work before approval too. The administration may decline a registration, for example if it suspects a duplicate or fake account.",
        "The club condemns Russia's aggression against Ukraine. Residents of Russia or Belarus cannot register on the site.",
        "Keep your sign-in secure. You are responsible for activity in your account. Tell us immediately if you suspect misuse.",
      ],
    },
    {
      id: "prezdivka",
      title: "Game nickname",
      items: [
        "Your nickname is shown publicly in ratings, results and sign-up lists. It must be unique, must not be offensive or vulgar, and must not impersonate another person or organisation.",
        "You can change your nickname once a year. More often only with the club administration's approval. The administration can link your previous nicknames to your account so that older results count towards it.",
        "The administration may change an inappropriate nickname.",
      ],
    },
    {
      id: "hry",
      title: "Game sign-ups",
      items: [
        "You sign up for games according to the schedule on the site. Seat numbers, queue rules, priority for membership holders and the waiting list are described for each game.",
        "If you can't come, cancel your sign-up as early as possible so the seat goes to someone else. Repeated no-shows without notice may lead to sign-up restrictions.",
        "The club may cancel or reschedule a game, for example if too few players sign up. We will let those signed up know.",
        "The Club Code and the rules the game is played by apply at games.",
      ],
    },
    {
      id: "chovani",
      title: "Conduct and bans",
      items: [
        "On the site and at games you must not insult, threaten, discriminate, cheat, exploit site errors, create fake accounts or get around restrictions.",
        "If you break the rules, the administration may warn you, ban you from games temporarily or permanently, restrict account features or delete the account. Bans may be published in the club's ban list.",
      ],
    },
    {
      id: "obsah",
      title: "Player content",
      items: [
        "Articles, photos and other content you upload must be your own or you must have the rights to it. It must not break the law or infringe the rights of others.",
        "By uploading content you grant us a free, non-exclusive licence to publish it on the site and on club channels, including in edited form (for example, shortened text or cropped photos), for as long as it is published. You keep your copyright.",
        "Articles are approved by the administration before publication. We may reject or remove content that breaks these terms.",
      ],
    },
    {
      id: "vysledky",
      title: "Results, photos and streams",
      items: [
        "Game results, statistics, ratings, titles and prize money are public and part of the club's sporting history.",
        "Games are photographed, and some tables are streamed and recorded. If you don't want to be filmed, tell the host before the game.",
      ],
    },
    {
      id: "respect",
      title: "Respect loyalty programme",
      items: [
        "Respect are the club's loyalty points. You earn them for activities described on the Respect page, such as games played, evening streaks, buying a membership, your birthday or an approved article, and by redeeming a code from a physical club coin.",
        "You can spend Respect on club evenings, memberships and merchandise at the rate shown on the site. Respect have no cash value and cannot be exchanged for money, transferred to another account or inherited.",
        "A coin code can be redeemed only once. We may remove points credited by mistake or obtained through abuse. If an order is cancelled, the points used are returned.",
        "We may change the programme rules and will announce changes on the site in advance. Points already credited do not expire because of a change. Points lapse when an account is deleted.",
      ],
    },
    {
      id: "odpovednost",
      title: "Availability and liability",
      items: [
        "We do our best to keep the site running, but we don't guarantee it will always be available and error-free. Maintenance or outages of third-party services may limit it temporarily.",
        "We are not responsible for the content of external sites we link to (for example, mafgame.org or YouTube).",
      ],
    },
    {
      id: "zruseni",
      title: "Deleting your account",
      items: [
        "You can delete your account at any time by writing to {email}. The Privacy Policy describes what happens to your data.",
        "We may delete an account for a serious or repeated breach of these terms.",
      ],
    },
    {
      id: "zaver",
      title: "Changes and final provisions",
      items: [
        "We may change these terms. We will publish the new version on the site at least 14 days before it takes effect. If you disagree, you can delete your account. By continuing to use the site you accept the change.",
        "These terms are governed by Czech law. This does not affect the rights the law gives you as a consumer.",
        "These terms are available in Czech, Russian, Ukrainian and English. If the versions differ, the Czech version prevails.",
        "This version is effective from {effective}.",
      ],
    },
  ],
};

export default text;
