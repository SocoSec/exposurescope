// lib/content.js
// ─────────────────────────────────────────────────────────────────────────────
// Educational text for the "Learn" tab, moved out of page.js unchanged except
// that report attributes are now arrays (report.attrs) instead of Sets.
// Awareness, not instructions: nothing here explains how to attack anyone.
// ─────────────────────────────────────────────────────────────────────────────

export function howLeaked(attrs, count) {
  const items = [{
    title: "Database breaches",
    body: "Companies you had accounts with were compromised and their user databases stolen. Your data appears because you had an account there — not because you did anything wrong.",
  }];
  if (attrs.includes("password")) items.push({
    title: "Credential dumps & stealer logs",
    body: "Exposed passwords are collected into massive combolists and traded. Info-stealer malware on infected devices also harvests saved credentials directly from browsers.",
  });
  items.push({
    title: "Aggregation over time",
    body: "Your identity surfaces across " + (count > 1 ? count + " separate breaches" : "breach sources") + ". Individually minor, together they form a fuller picture — the effect this report measures.",
  });
  return items;
}

export function howWeaponised(attrs) {
  const items = [];
  if (attrs.includes("password")) items.push({
    title: "Credential stuffing → account takeover",
    body: "Attackers replay leaked email and password pairs against banking, email, and shopping sites, betting on reuse. One reused password can unlock many accounts.",
  });
  if (attrs.includes("email")) items.push({
    title: "Targeted phishing",
    body: "Knowing which services you use, attackers craft convincing messages that impersonate those exact brands to steal logins or payment details.",
  });
  if (attrs.includes("phone")) items.push({
    title: "SIM swapping",
    body: "With your number and some personal detail, an attacker can socially engineer your carrier into moving your number to their SIM — intercepting SMS codes.",
  });
  if (attrs.includes("financial")) items.push({
    title: "Payment fraud & identity theft",
    body: "Financial data supports direct fraud and, combined with your name and address, opening accounts or loans in your name.",
  });
  items.push({
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
      title: "Search engines",
      body: "See what a search engine surfaces for your email. Attackers start here to connect an address to public profiles and posts. (The link opens Google, which will see this search.)",
      action: { label: "Search my email", url: "https://www.google.com/search?q=" + encodeURIComponent('"' + identifier + '"') },
    });
  }
  if (attrs.includes("username")) items.push({
    title: "Username reuse",
    body: "Your usernames appear in breach data. If you reuse the same handle across platforms, those profiles can be linked together. Search the platforms you use for your handles and change the ones you want kept separate.",
  });
  if (attrs.includes("email")) items.push({
    title: "Connected accounts",
    body: "Many sites reveal whether an email has an account during password reset. Review which services are tied to this email and close the ones you no longer use.",
  });
  items.push({
    title: "Data brokers",
    body: "People-search and broker sites compile public records with breach data into profiles. Search the major brokers for your name and use their opt-out forms to request removal.",
  });
  items.push({
    title: "Photos & metadata",
    body: "Public photos can carry GPS metadata and enable reverse-image linkage. Strip location data before posting and review images you're tagged in.",
  });
  return items;
}
