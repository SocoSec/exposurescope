// lib/content.js
// ─────────────────────────────────────────────────────────────────────────────
// Educational text for the "Learn" tab, moved out of page.js unchanged except
// that report attributes are now arrays (report.attrs) instead of Sets.
// Awareness, not instructions: nothing here explains how to attack anyone.
// ─────────────────────────────────────────────────────────────────────────────

// Every item below carries BOTH registers. `simple` is the plain-language
// version — short words, one idea, an everyday comparison — and `body` is the
// precise one. They sit together rather than replacing one another, because a
// reader who needs the plain version still deserves the accurate one beneath
// it, and a supervisor reading the same screen should find nothing dumbed
// down. `scene` names the illustration drawn in app/components/Explain.js.

// The four-panel story of how an address ends up in a report like this one.
// Read left to right; the fourth panel is what the score actually measures.
export const LEAK_STORY = [
  { scene: "signup",  head: "You made an account",
    body: "You gave a website your email address, the way you write your name on a list." },
  { scene: "breakin", head: "The website was robbed",
    body: "Someone broke in and took the whole list. You did nothing wrong — the website lost it." },
  { scene: "copies",  head: "The list was copied",
    body: "Copies get passed around and sold, over and over. A copy cannot be taken back." },
  { scene: "mosaic",  head: "Your pieces were joined up",
    body: "Bits from different lists get put together, like puzzle pieces making one picture of you." },
];


export function howLeaked(attrs, count) {
  const items = [{
    scene: "breakin",
    simple: { head: "A company lost your details", body: "You had an account there. Someone stole the whole list of users." },
    title: "Database breaches",
    body: "Companies you had accounts with were compromised and their user databases stolen. Your data appears because you had an account there — not because you did anything wrong.",
  }];
  if (attrs.includes("password")) items.push({
    scene: "copies",
    simple: { head: "Passwords get collected", body: "Stolen passwords are gathered into huge lists and traded between people." },
    title: "Credential dumps & stealer logs",
    body: "Exposed passwords are collected into massive combolists and traded. Info-stealer malware on infected devices also harvests saved credentials directly from browsers.",
  });
  items.push({
    scene: "mosaic",
    simple: { head: "Small things add up", body: "One leak says little about you. Several leaks together say a lot." },
    title: "Aggregation over time",
    body: "Your identity surfaces across " + (count > 1 ? count + " separate breaches" : "breach sources") + ". Individually minor, together they form a fuller picture — the effect this report measures.",
  });
  return items;
}

export function howWeaponised(attrs) {
  const items = [];
  if (attrs.includes("password")) items.push({
    scene: "manydoors",
    simple: { head: "One key, many doors", body: "If the same password opens several of your accounts, one stolen password opens all of them." },
    title: "Credential stuffing → account takeover",
    body: "Attackers replay leaked email and password pairs against banking, email, and shopping sites, betting on reuse. One reused password can unlock many accounts.",
  });
  if (attrs.includes("email")) items.push({
    scene: "fakemail",
    simple: { head: "Messages that look real", body: "They know which websites you use, so they can write a message that looks like it came from one." },
    title: "Targeted phishing",
    body: "Knowing which services you use, attackers craft convincing messages that impersonate those exact brands to steal logins or payment details.",
  });
  if (attrs.includes("phone")) items.push({
    scene: "simswap",
    simple: { head: "Taking over your number", body: "They talk your phone company into moving your number to their phone, so your codes arrive there." },
    title: "SIM swapping",
    body: "With your number and some personal detail, an attacker can socially engineer your carrier into moving your number to their SIM — intercepting SMS codes.",
  });
  if (attrs.includes("financial")) items.push({
    scene: "card",
    simple: { head: "Spending in your name", body: "Card details let someone buy things, or sign up for things while pretending to be you." },
    title: "Payment fraud & identity theft",
    body: "Financial data supports direct fraud and, combined with your name and address, opening accounts or loans in your name.",
  });
  items.push({
    scene: "mosaic",
    simple: { head: "Puzzle pieces make a picture", body: "The danger is the pieces together. Apart they look harmless; joined up they point at one person." },
    title: "Mosaic re-identification",
    body: "The real risk is combination: fragments from different breaches are linked to build a single, detailed profile of you — the basis of modern targeted attacks.",
  });
  return items;
}

// Self-check guidance. Exposio does NOT fetch anyone's public profiles or posts;
// it shows the user how to inspect their own footprint themselves.
export function footprint(attrs, identifier, kind) {
  const items = [];
  if (kind === "email" && identifier) {
    items.push({
      scene: "search",
      simple: { head: "Look yourself up", body: "See what a search engine already shows about your address." },
      title: "Search engines",
      body: "See what a search engine surfaces for your email. Attackers start here to connect an address to public profiles and posts. (The link opens Google, which will see this search.)",
      action: { label: "Search my email", url: "https://www.google.com/search?q=" + encodeURIComponent('"' + identifier + '"') },
    });
  }
  if (attrs.includes("username")) items.push({
    scene: "nickname",
    simple: { head: "The same nickname everywhere", body: "Use one nickname in many places and your accounts can be joined together." },
    title: "Username reuse",
    body: "Your usernames appear in breach data. If you reuse the same handle across platforms, those profiles can be linked together. Search the platforms you use for your handles and change the ones you want kept separate.",
  });
  if (attrs.includes("email")) items.push({
    scene: "oldaccounts",
    simple: { head: "Old accounts you forgot", body: "Accounts you stopped using still hold your details. Close the ones you no longer need." },
    title: "Connected accounts",
    body: "Many sites reveal whether an email has an account during password reset. Review which services are tied to this email and close the ones you no longer use.",
  });
  items.push({
    scene: "brokers",
    simple: { head: "Companies that sell facts about you", body: "Some websites collect details about people and sell them. You can ask them to remove yours." },
    title: "Data brokers",
    body: "People-search and broker sites compile public records with breach data into profiles. Search the major brokers for your name and use their opt-out forms to request removal.",
  });
  items.push({
    scene: "photo",
    simple: { head: "Photos remember places", body: "A photo can quietly store where it was taken. Turn that off before you post." },
    title: "Photos & metadata",
    body: "Public photos can carry GPS metadata and enable reverse-image linkage. Strip location data before posting and review images you're tagged in.",
  });
  return items;
}
