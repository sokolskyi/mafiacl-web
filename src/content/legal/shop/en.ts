import type { LegalText } from "../types";

const text: LegalText = {
  title: "Terms of Sale",
  lead: "Terms for buying goods and memberships in the MafiaCL Prague shop on mafiacl.com.",
  sections: [
    {
      id: "prodavajici",
      title: "Seller",
      items: [
        "The seller is {name}, company ID (IČO) {ico}, business address {address}, a self-employed person entered in the Czech Trade Register (Úřad městské části Praha 9). The seller is not registered for VAT (DPH).",
        "Contact: e-mail {email}, phone {phone}. In person at club games according to the schedule on the site.",
        "Consumer protection is supervised by the Czech Trade Inspection Authority (Česká obchodní inspekce), coi.gov.cz.",
        "These terms govern the relationship between the seller and the buyer. If the buyer is a consumer, they have rights under the Czech Civil Code (Act No. 89/2012 Coll.) and the Consumer Protection Act, which these terms cannot limit.",
      ],
    },
    {
      id: "nabidka",
      title: "Goods and prices",
      items: [
        "The shop sells club merchandise (for example clothing, mugs, masks, gift vouchers) and memberships for club games.",
        "Each item shows a description, variants and price. Prices are final, in Czech crowns. The seller is not registered for VAT, so prices include no VAT. Goods are not shipped, so there are no delivery charges.",
        "For some memberships the price depends on the purchase date. The price shown when you submit the order applies.",
      ],
    },
    {
      id: "objednavka",
      title: "Placing an order and the contract",
      items: [
        "You need an account on the site to order. Put items in the cart, check the contents, price and details (nickname and colour for printed items, start date for a membership) and submit the order with the “Order with obligation to pay” button.",
        "Submitting the order concludes the purchase contract. You'll find the confirmation and order status in your account under Orders. You can correct mistakes in the cart before submitting.",
        "Before completing the order you get to read these terms. You can save or print the current version from this page at any time.",
        "An order not paid within 48 hours is cancelled automatically. You can also cancel an unpaid order yourself.",
      ],
    },
    {
      id: "platba",
      title: "Payment",
      items: [
        "You pay for the order at a club game in cash, by card or by bank transfer. Club staff mark the order as paid.",
        "Once online card payment through a payment gateway is available, you'll also be able to pay directly on the site. You enter card details only in the payment gateway; the seller never sees them.",
        "You can pay part of the price with Respect points at the rate shown on the site. If the order is cancelled or you withdraw from the contract, the points are returned to your account.",
        "We issue a receipt for your payment.",
      ],
    },
    {
      id: "prevzeti",
      title: "Collecting your goods",
      items: [
        "You collect paid goods in person at one of the next club games. We do not ship goods.",
        "In-stock items are ready at the next game after payment. Made-to-order items (for example with your nickname printed) within 30 days of payment unless stated otherwise for the item. We will tell you about any delay.",
        "Risk of damage passes to the buyer on collection.",
      ],
    },
    {
      id: "permanentky",
      title: "Memberships",
      items: [
        "A membership is prepayment for club games during its validity. The games it covers, its duration and its benefits (for example priority sign-up) are stated in the membership description.",
        "It starts on the date you choose, or right after payment if you choose no date. A membership is personal and cannot be transferred to another person.",
        "Tournaments with a separate entry fee are not included unless the description says otherwise. Games not used during the validity period are not compensated or refunded, except when the club cancels a game.",
      ],
    },
    {
      id: "odstoupeni",
      title: "Withdrawal from the contract",
      items: [
        "A consumer may withdraw from the contract without giving a reason within 14 days. For goods, the period runs from collection; for a membership, from the conclusion of the contract.",
        "Tell us about your withdrawal with any clear statement, for example by e-mail to {email}. You may use the model form below, but you don't have to. The deadline is met if you send the statement before it expires.",
        "Return the goods in person at the club within 14 days of withdrawing. Goods should be undamaged and not used beyond normal trying on. We may claim compensation for any loss in value caused by other handling.",
        "We refund you within 14 days of withdrawal using the same payment method you used, or another way if agreed. For goods, not before you return them.",
        "If you asked for a membership to start during the withdrawal period and then withdraw, we refund the price minus a proportional part for the time until withdrawal.",
        "You cannot withdraw from a purchase of goods made to your specification (for example with your nickname printed), or of sealed goods that cannot be returned for hygiene reasons once unsealed.",
      ],
    },
    {
      id: "vady",
      title: "Defects and complaints",
      items: [
        "We are responsible for goods being free of defects when you collect them. A consumer can claim a defect within 24 months of collection.",
        "You can make a claim in person at the club or by e-mail to {email}. Give the order number and describe the defect, ideally with a photo.",
        "You can ask for repair or replacement and, if that isn't possible, a reasonable discount or, for a material defect, withdrawal from the contract. We handle the claim and tell you the result within 30 days unless we agree on a longer period.",
        "The warranty does not cover normal wear and tear or defects caused by improper use.",
      ],
    },
    {
      id: "stiznosti",
      title: "Complaints and out-of-court dispute resolution",
      items: [
        "Send complaints to {email}. We reply without undue delay.",
        "A consumer has the right to out-of-court dispute resolution. The competent body is the Czech Trade Inspection Authority, ADR department, Gorazdova 1969/24, 120 00 Praha 2, adr.coi.gov.cz.",
      ],
    },
    {
      id: "zaver",
      title: "Final provisions",
      items: [
        "We process personal data according to the Privacy Policy.",
        "The contract is governed by Czech law. These terms are available in Czech, Russian, Ukrainian and English. If the versions differ, the Czech version prevails.",
        "We may change these terms. Your order is governed by the version in effect when you submitted it.",
        "This version is effective from {effective}.",
      ],
    },
    {
      id: "vzor",
      title: "Model withdrawal form",
      items: [
        "To: {name}, {address}, e-mail {email}.",
        "I hereby give notice that I withdraw from the contract for the purchase of the following goods / membership: ______",
        "Order number: ______ · Ordered on / collected on: ______",
        "Name: ______ · E-mail or address: ______",
        "Date and signature (paper form only): ______",
      ],
    },
  ],
};

export default text;
