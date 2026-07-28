"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";

// ---- Internationalisation (i18n) ----
const LANGS = [
  { code: "en", label: "EN", name: "English" },
  { code: "fr", label: "FR", name: "Français" },
  { code: "de", label: "DE", name: "Deutsch" },
  { code: "es", label: "ES", name: "Español" },
  { code: "it", label: "IT", name: "Italiano" },
  { code: "cs", label: "CS", name: "Čeština" },
];
const LANG_NAME = { en: "English", fr: "French", de: "German", es: "Spanish", it: "Italian", cs: "Czech" };
const STR = {
  en: {
    title: "Check your exposure",
    lede: "One check across breach intelligence — Have I Been Pwned and DeHashed. Enter an email, phone, or password (your own) for a full Exposure Report. Nothing is stored.",
    inputLabel: "Email · phone · password",
    placeholder: "Enter one to check",
    detected: "Detected", kEmail: "email address", kPhone: "phone number", kPassword: "password",
    run: "Run check", checking: "Checking",
    consent: ["I'm checking ", "my own", " data. Zero storage — the password never leaves my browser, and the rest is processed in-session only."],
    tabs: { overview: "Overview", details: "Details", actions: "Actions", learn: "Learn" },
    bands: { safe: "Safe", low: "Low", medium: "Medium", high: "High" },
    heads: { safe: "No exposure found", low: "Limited exposure", medium: "Notable exposure", high: "Significant exposure" },
    sources: "Sources checked", breaches: "breaches", breach: "breach",
    checkAnother: "Check another", printReport: "Save / print report",
    botTitle: "Ask ExpoBot", botGreeting: "{L.botGreeting}",
    botChips: ["What should I do first?", "Explain my score", "Am I at risk?"],
    botPlaceholder: "Ask ExpoBot…", send: "Send", thinking: "Thinking…",
    nudge: "I saw your report — want the top 3 fixes?", nudgeCta: "Show me", nudgeAsk: "What are my top 3 fixes?",
    footer1: "Exposio · ephemeral orchestration layer over Have I Been Pwned & DeHashed",
    footer2: "{L.footer2}",
  },
  fr: {
    title: "Vérifiez votre exposition",
    lede: "Une seule vérification sur les sources de fuites — Have I Been Pwned et DeHashed. Saisissez un e-mail, un téléphone ou un mot de passe (le vôtre) pour un rapport d'exposition complet. Rien n'est stocké.",
    inputLabel: "E-mail · téléphone · mot de passe",
    placeholder: "Saisissez une valeur à vérifier",
    detected: "Détecté", kEmail: "adresse e-mail", kPhone: "numéro de téléphone", kPassword: "mot de passe",
    run: "Vérifier", checking: "Vérification",
    consent: ["Je vérifie ", "mes propres", " données. Aucun stockage — le mot de passe ne quitte jamais mon navigateur, le reste est traité uniquement pendant la session."],
    tabs: { overview: "Aperçu", details: "Détails", actions: "Actions", learn: "Comprendre" },
    bands: { safe: "Sûr", low: "Faible", medium: "Moyen", high: "Élevé" },
    heads: { safe: "Aucune exposition trouvée", low: "Exposition limitée", medium: "Exposition notable", high: "Exposition importante" },
    sources: "Sources consultées", breaches: "fuites", breach: "fuite",
    checkAnother: "Vérifier une autre", printReport: "Enregistrer / imprimer",
    botTitle: "Demander à ExpoBot", botGreeting: "Bonjour ! Je suis ExpoBot. J'ai lu votre rapport d'exposition — demandez-moi quoi faire, ou touchez une suggestion ci-dessous.",
    botChips: ["Que dois-je faire en premier ?", "Expliquer mon score", "Suis-je à risque ?"],
    botPlaceholder: "Demander à ExpoBot…", send: "Envoyer", thinking: "Réflexion…",
    nudge: "J'ai vu votre rapport — voulez-vous les 3 correctifs prioritaires ?", nudgeCta: "Montrez-moi", nudgeAsk: "Quels sont mes 3 correctifs prioritaires ?",
    footer1: "Exposio · couche d'orchestration éphémère sur Have I Been Pwned & DeHashed",
    footer2: "Sans stockage · auto-évaluation uniquement · prototype de mémoire de master, Université Óbuda",
  },
  de: {
    title: "Prüfen Sie Ihre Gefährdung",
    lede: "Eine Prüfung über Leak-Datenbanken — Have I Been Pwned und DeHashed. Geben Sie eine E-Mail, Telefonnummer oder ein Passwort (Ihr eigenes) für einen vollständigen Gefährdungsbericht ein. Nichts wird gespeichert.",
    inputLabel: "E-Mail · Telefon · Passwort",
    placeholder: "Wert zum Prüfen eingeben",
    detected: "Erkannt", kEmail: "E-Mail-Adresse", kPhone: "Telefonnummer", kPassword: "Passwort",
    run: "Prüfen", checking: "Prüfung läuft",
    consent: ["Ich prüfe ", "meine eigenen", " Daten. Keine Speicherung — das Passwort verlässt nie meinen Browser, der Rest wird nur während der Sitzung verarbeitet."],
    tabs: { overview: "Übersicht", details: "Details", actions: "Maßnahmen", learn: "Lernen" },
    bands: { safe: "Sicher", low: "Niedrig", medium: "Mittel", high: "Hoch" },
    heads: { safe: "Keine Gefährdung gefunden", low: "Begrenzte Gefährdung", medium: "Erhebliche Gefährdung", high: "Bedeutende Gefährdung" },
    sources: "Geprüfte Quellen", breaches: "Leaks", breach: "Leak",
    checkAnother: "Weitere prüfen", printReport: "Speichern / drucken",
    botTitle: "ExpoBot fragen", botGreeting: "Hallo! Ich bin ExpoBot. Ich habe Ihren Gefährdungsbericht gelesen — fragen Sie mich, was zu tun ist, oder tippen Sie unten auf einen Vorschlag.",
    botChips: ["Was sollte ich zuerst tun?", "Meine Bewertung erklären", "Bin ich gefährdet?"],
    botPlaceholder: "ExpoBot fragen…", send: "Senden", thinking: "Denke nach…",
    nudge: "Ich habe Ihren Bericht gesehen — möchten Sie die 3 wichtigsten Maßnahmen?", nudgeCta: "Zeig mir", nudgeAsk: "Was sind meine 3 wichtigsten Maßnahmen?",
    footer1: "Exposio · flüchtige Orchestrierungsschicht über Have I Been Pwned & DeHashed",
    footer2: "Ohne Speicherung · nur Selbsteinschätzung · Masterarbeit-Prototyp, Óbuda-Universität",
  },
  es: {
    title: "Comprueba tu exposición",
    lede: "Una sola comprobación en fuentes de filtraciones — Have I Been Pwned y DeHashed. Introduce un correo, teléfono o contraseña (los tuyos) para un informe de exposición completo. No se almacena nada.",
    inputLabel: "Correo · teléfono · contraseña",
    placeholder: "Introduce un valor para comprobar",
    detected: "Detectado", kEmail: "dirección de correo", kPhone: "número de teléfono", kPassword: "contraseña",
    run: "Comprobar", checking: "Comprobando",
    consent: ["Estoy comprobando ", "mis propios", " datos. Sin almacenamiento — la contraseña nunca sale de mi navegador, y el resto se procesa solo durante la sesión."],
    tabs: { overview: "Resumen", details: "Detalles", actions: "Acciones", learn: "Aprender" },
    bands: { safe: "Seguro", low: "Bajo", medium: "Medio", high: "Alto" },
    heads: { safe: "No se encontró exposición", low: "Exposición limitada", medium: "Exposición notable", high: "Exposición significativa" },
    sources: "Fuentes consultadas", breaches: "filtraciones", breach: "filtración",
    checkAnother: "Comprobar otro", printReport: "Guardar / imprimir",
    botTitle: "Preguntar a ExpoBot", botGreeting: "¡Hola! Soy ExpoBot. He leído tu informe de exposición — pregúntame qué hacer o toca una sugerencia abajo.",
    botChips: ["¿Qué debo hacer primero?", "Explicar mi puntuación", "¿Estoy en riesgo?"],
    botPlaceholder: "Preguntar a ExpoBot…", send: "Enviar", thinking: "Pensando…",
    nudge: "Vi tu informe — ¿quieres las 3 soluciones prioritarias?", nudgeCta: "Muéstrame", nudgeAsk: "¿Cuáles son mis 3 soluciones prioritarias?",
    footer1: "Exposio · capa de orquestación efímera sobre Have I Been Pwned y DeHashed",
    footer2: "Sin almacenamiento · solo autoevaluación · prototipo de tesis de máster, Universidad Óbuda",
  },
  it: {
    title: "Controlla la tua esposizione",
    lede: "Un solo controllo sulle fonti di violazioni — Have I Been Pwned e DeHashed. Inserisci un'e-mail, un telefono o una password (i tuoi) per un rapporto di esposizione completo. Nulla viene memorizzato.",
    inputLabel: "E-mail · telefono · password",
    placeholder: "Inserisci un valore da controllare",
    detected: "Rilevato", kEmail: "indirizzo e-mail", kPhone: "numero di telefono", kPassword: "password",
    run: "Controlla", checking: "Controllo in corso",
    consent: ["Sto controllando ", "i miei", " dati. Nessuna memorizzazione — la password non lascia mai il browser, il resto è elaborato solo durante la sessione."],
    tabs: { overview: "Panoramica", details: "Dettagli", actions: "Azioni", learn: "Approfondisci" },
    bands: { safe: "Sicuro", low: "Basso", medium: "Medio", high: "Alto" },
    heads: { safe: "Nessuna esposizione trovata", low: "Esposizione limitata", medium: "Esposizione notevole", high: "Esposizione significativa" },
    sources: "Fonti consultate", breaches: "violazioni", breach: "violazione",
    checkAnother: "Controlla un altro", printReport: "Salva / stampa",
    botTitle: "Chiedi a ExpoBot", botGreeting: "Ciao! Sono ExpoBot. Ho letto il tuo rapporto di esposizione — chiedimi cosa fare o tocca un suggerimento qui sotto.",
    botChips: ["Cosa devo fare per primo?", "Spiega il mio punteggio", "Sono a rischio?"],
    botPlaceholder: "Chiedi a ExpoBot…", send: "Invia", thinking: "Sto pensando…",
    nudge: "Ho visto il tuo rapporto — vuoi le 3 correzioni prioritarie?", nudgeCta: "Mostrami", nudgeAsk: "Quali sono le mie 3 correzioni prioritarie?",
    footer1: "Exposio · livello di orchestrazione effimero su Have I Been Pwned e DeHashed",
    footer2: "Senza memorizzazione · solo autovalutazione · prototipo di tesi magistrale, Università Óbuda",
  },
  cs: {
    title: "Zkontrolujte své vystavení",
    lede: "Jedna kontrola napříč zdroji úniků — Have I Been Pwned a DeHashed. Zadejte e-mail, telefon nebo heslo (svoje) pro úplnou zprávu o vystavení. Nic se neukládá.",
    inputLabel: "E-mail · telefon · heslo",
    placeholder: "Zadejte hodnotu ke kontrole",
    detected: "Rozpoznáno", kEmail: "e-mailová adresa", kPhone: "telefonní číslo", kPassword: "heslo",
    run: "Zkontrolovat", checking: "Kontroluji",
    consent: ["Kontroluji ", "svá vlastní", " data. Žádné ukládání — heslo nikdy neopustí můj prohlížeč a zbytek se zpracovává pouze během relace."],
    tabs: { overview: "Přehled", details: "Podrobnosti", actions: "Kroky", learn: "Poučení" },
    bands: { safe: "Bezpečné", low: "Nízké", medium: "Střední", high: "Vysoké" },
    heads: { safe: "Žádné vystavení nenalezeno", low: "Omezené vystavení", medium: "Významné vystavení", high: "Zásadní vystavení" },
    sources: "Zkontrolované zdroje", breaches: "úniků", breach: "únik",
    checkAnother: "Zkontrolovat další", printReport: "Uložit / vytisknout",
    botTitle: "Zeptat se ExpoBota", botGreeting: "Ahoj! Jsem ExpoBot. Přečetl jsem si vaši zprávu o vystavení — zeptejte se mě, co dělat, nebo klepněte na návrh níže.",
    botChips: ["Co mám udělat jako první?", "Vysvětlit mé skóre", "Jsem v ohrožení?"],
    botPlaceholder: "Zeptat se ExpoBota…", send: "Odeslat", thinking: "Přemýšlím…",
    nudge: "Viděl jsem vaši zprávu — chcete 3 hlavní opravy?", nudgeCta: "Ukaž mi", nudgeAsk: "Jaké jsou mé 3 hlavní opravy?",
    footer1: "Exposio · dočasná orchestrační vrstva nad Have I Been Pwned a DeHashed",
    footer2: "Bez ukládání · pouze sebehodnocení · prototyp diplomové práce, Univerzita Óbuda",
  },
};

// Exposio — ephemeral orchestration layer over Have I Been Pwned & DeHashed.
// Enter your own email, phone, or password and receive a full Exposure Report:
// score, breakdown, timeline, remediation (ExpoBot), how the data leaked, how
// it can be weaponised, and a mosaic view of what an attacker could assemble.
// Zero storage: password never leaves the browser (k-anonymity); the rest is
// processed in-session and discarded.

const STYLE = `
.x-root{--bg:#080B12;--card:#0F1521;--card2:#131B29;--line:#1C2636;--ink:#DBE4F1;--mute:#67748B;
  --sig:#38C89A;--amber:#E6B057;--coral:#E56A5A;
  background:var(--bg);color:var(--ink);min-height:100vh;
  font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;
  display:flex;align-items:flex-start;justify-content:center;}
.x-wrap{width:100%;max-width:620px;padding:60px 22px 90px;}
.x-langbar{display:flex;justify-content:center;gap:4px;margin-bottom:16px;flex-wrap:wrap;}
.x-langbtn{background:none;border:1px solid var(--line);color:var(--mute);border-radius:7px;padding:4px 9px;font-family:ui-monospace,monospace;font-size:11px;font-weight:600;letter-spacing:.05em;cursor:pointer;transition:border-color .15s,color .15s,background .15s;}
.x-langbtn:hover{color:var(--ink);border-color:var(--sig);}
.x-langbtn.on{background:var(--sig);color:#04201A;border-color:var(--sig);}
.x-brand{font-family:ui-monospace,"JetBrains Mono",Menlo,monospace;font-size:12px;letter-spacing:.34em;text-transform:uppercase;color:var(--sig);text-align:center;}
.x-title{font-size:29px;font-weight:650;letter-spacing:-.02em;text-align:center;margin:12px 0 8px;}
.x-lede{color:var(--mute);font-size:13.5px;line-height:1.55;text-align:center;max-width:46ch;margin:0 auto;}
.x-card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:24px;margin-top:22px;}
.x-label{font-family:ui-monospace,monospace;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--mute);margin-bottom:10px;display:block;}
.x-input{width:100%;box-sizing:border-box;background:var(--bg);border:1px solid var(--line);border-radius:11px;padding:15px 16px;color:var(--ink);font-size:15px;font-family:ui-monospace,monospace;outline:none;transition:border-color .15s;}
.x-input:focus{border-color:var(--sig);}
.x-kind{font-family:ui-monospace,monospace;font-size:11px;color:var(--mute);margin-top:9px;min-height:15px;letter-spacing:.03em;}
.x-kind b{color:var(--sig);}
.x-btn{width:100%;margin-top:16px;background:var(--sig);color:#04201A;border:none;border-radius:11px;padding:15px;font-size:14px;font-weight:700;cursor:pointer;letter-spacing:.03em;font-family:ui-monospace,monospace;text-transform:uppercase;transition:transform .1s,opacity .15s;}
.x-btn:hover:not(:disabled){transform:translateY(-1px);}
.x-btn:disabled{opacity:.4;cursor:not-allowed;}
.x-consent{display:flex;gap:10px;align-items:flex-start;font-size:12.5px;line-height:1.5;color:var(--mute);cursor:pointer;margin-top:18px;}
.x-consent input{margin-top:2px;width:15px;height:15px;accent-color:var(--sig);flex-shrink:0;}
.x-consent b{color:var(--ink);font-weight:600;}
.x-err{color:var(--coral);font-size:12.5px;margin-top:12px;font-family:ui-monospace,monospace;text-align:center;}
.x-spin{display:inline-block;width:13px;height:13px;border:2px solid #04201A;border-top-color:transparent;border-radius:50%;animation:x-rot .7s linear infinite;vertical-align:-1px;margin-right:8px;}
@keyframes x-rot{to{transform:rotate(360deg);}}

/* report */
.x-hero{text-align:center;padding:8px 0 4px;}
.x-gauge{position:relative;width:150px;height:150px;margin:0 auto 14px;}
.x-gnum{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;}
.x-gval{font-family:ui-monospace,monospace;font-size:42px;font-weight:700;line-height:1;}
.x-gof{font-family:ui-monospace,monospace;font-size:11px;color:var(--mute);margin-top:3px;}
.x-band{font-family:ui-monospace,monospace;font-size:13px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;}
.x-hhead{font-size:19px;font-weight:650;margin:6px 0 6px;letter-spacing:-.01em;}
.x-hsub{color:var(--mute);font-size:13px;line-height:1.55;max-width:46ch;margin:0 auto;}
.x-sec{margin-top:20px;}
.x-sech{display:flex;align-items:center;gap:10px;margin-bottom:12px;}
.x-secn{font-family:ui-monospace,monospace;font-size:11px;color:var(--sig);letter-spacing:.12em;}
.x-sect{font-size:15px;font-weight:650;letter-spacing:-.01em;}
.x-secd{color:var(--mute);font-size:12.5px;line-height:1.5;margin:-6px 0 14px;}
.x-bar{display:flex;align-items:center;gap:10px;margin-bottom:9px;font-size:12.5px;}
.x-bar .bl{width:118px;flex-shrink:0;color:var(--mute);font-family:ui-monospace,monospace;font-size:11px;text-transform:uppercase;letter-spacing:.03em;}
.x-bar .bt{flex:1;height:9px;background:var(--bg);border-radius:6px;overflow:hidden;}
.x-bar .bf{height:100%;border-radius:6px;}
.x-bar .bv{width:20px;text-align:right;font-family:ui-monospace,monospace;color:var(--ink);}
.x-mosaic{display:flex;flex-wrap:wrap;gap:8px;margin-top:4px;}
.x-chip{display:flex;align-items:center;gap:7px;padding:8px 12px;border-radius:10px;border:1px solid var(--line);font-size:12.5px;font-family:ui-monospace,monospace;}
.x-chip.on{border-color:var(--coral);background:rgba(229,106,90,.09);color:var(--ink);}
.x-chip.off{color:var(--mute);opacity:.5;}
.x-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;}
.x-remcard{border:1px solid var(--line);border-radius:12px;padding:15px 16px;margin-top:10px;background:var(--card2);}
.x-remtop{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:8px;}
.x-remcat{font-family:ui-monospace,monospace;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--sig);}
.x-remred{font-family:ui-monospace,monospace;font-size:11px;color:var(--sig);white-space:nowrap;}
.x-remfind{font-size:13px;line-height:1.5;margin-bottom:8px;}
.x-remsteps{margin:0;padding-left:18px;color:var(--mute);font-size:12.5px;line-height:1.6;}
.x-info{border-left:2px solid var(--line);padding:2px 0 2px 14px;margin-top:12px;}
.x-infot{font-size:13px;font-weight:650;margin-bottom:3px;}
.x-infob{color:var(--mute);font-size:12.5px;line-height:1.55;}
.x-actions{display:flex;gap:10px;margin-top:22px;}
.x-again,.x-print{flex:1;background:none;border:1px solid var(--line);color:var(--mute);border-radius:10px;padding:12px;font-family:ui-monospace,monospace;font-size:12px;letter-spacing:.06em;text-transform:uppercase;cursor:pointer;transition:border-color .15s,color .15s;}
.x-again:hover,.x-print:hover{border-color:var(--sig);color:var(--sig);}
.x-tag{font-family:ui-monospace,monospace;font-size:11px;font-weight:700;padding:3px 9px;border-radius:999px;letter-spacing:.03em;}
.x-src{margin-top:12px;text-align:center;font-family:ui-monospace,monospace;font-size:11px;color:var(--mute);letter-spacing:.04em;}
.x-foot{margin-top:26px;color:var(--mute);font-size:10.5px;line-height:1.6;text-align:center;font-family:ui-monospace,monospace;}
.x-explain{border-radius:10px;padding:12px 14px;font-size:13px;line-height:1.6;margin-bottom:16px;background:rgba(255,255,255,.02);border:1px solid var(--line);}
.x-lglabel{font-size:12px;color:var(--mute);margin-bottom:8px;line-height:1.5;}
.x-legend{margin-bottom:16px;}
.x-lgrow{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:8px 0;border-bottom:1px dashed var(--line);font-size:12.5px;}
.x-lgrow:last-child{border-bottom:none;}
.x-lgrow .ll{display:flex;align-items:center;gap:8px;color:var(--mute);}
.x-lgrow .lw{font-family:ui-monospace,monospace;font-size:11px;color:var(--mute);white-space:nowrap;}
.x-lgrow.on .ll{color:var(--ink);font-weight:600;}
.x-lgrow.on .lw{color:var(--sig);}
.ldot{width:8px;height:8px;border-radius:50%;flex-shrink:0;}
.x-btable{border-top:1px solid var(--line);}
.x-btrow{display:grid;grid-template-columns:1.7fr .6fr 1fr 1.1fr;gap:8px;align-items:center;padding:9px 0;border-bottom:1px solid var(--line);font-size:12px;}
.x-btrow .c{font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.x-bthead{color:var(--mute);font-family:ui-monospace,monospace;font-size:10px;letter-spacing:.06em;text-transform:uppercase;}
.x-btrow .contrib{display:flex;align-items:center;gap:7px;font-family:ui-monospace,monospace;font-size:11px;justify-content:flex-end;}
.x-btrow .cbar{height:6px;border-radius:4px;flex:0 0 auto;}
.x-btfoot{display:flex;justify-content:space-between;padding:9px 2px;font-size:12.5px;border-bottom:1px solid var(--line);font-family:ui-monospace,monospace;color:var(--mute);}
.x-btfoot:last-child{border-bottom:none;font-weight:700;color:var(--ink);}
.x-fpfound{border:1px dashed var(--line);border-radius:12px;padding:14px 15px;margin-bottom:14px;background:rgba(103,116,139,.05);}
.x-fpfoundh{font-family:ui-monospace,monospace;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--mute);margin-bottom:6px;}
.x-fpfoundb{color:var(--mute);font-size:12.5px;line-height:1.55;}
.x-fplink{display:inline-block;margin-top:8px;font-family:ui-monospace,monospace;font-size:12px;color:var(--sig);text-decoration:none;border:1px solid var(--line);border-radius:8px;padding:6px 11px;transition:border-color .15s;}
.x-fplink:hover{border-color:var(--sig);}
.x-chat{display:flex;flex-direction:column;gap:8px;max-height:340px;overflow-y:auto;padding:4px 2px;margin-bottom:12px;}
.x-msg{padding:10px 13px;border-radius:13px;font-size:13px;line-height:1.55;max-width:88%;white-space:pre-wrap;}
.x-msg.bot{background:var(--card2);border:1px solid var(--line);align-self:flex-start;border-bottom-left-radius:4px;}
.x-msg.me{background:var(--sig);color:#04201A;align-self:flex-end;border-bottom-right-radius:4px;font-weight:500;}
.x-chips{display:flex;flex-wrap:wrap;gap:7px;margin-bottom:11px;}
.x-chip2{background:none;border:1px solid var(--line);color:var(--mute);border-radius:999px;padding:6px 12px;font-size:12px;cursor:pointer;transition:border-color .15s,color .15s;font-family:inherit;}
.x-chip2:hover:not(:disabled){border-color:var(--sig);color:var(--sig);}
.x-chip2:disabled{opacity:.5;cursor:not-allowed;}
.x-chatin{display:flex;gap:8px;}
.x-send{background:var(--sig);color:#04201A;border:none;border-radius:10px;padding:0 18px;font-family:ui-monospace,monospace;font-size:12px;font-weight:700;text-transform:uppercase;cursor:pointer;white-space:nowrap;}
.x-send:disabled{opacity:.4;cursor:not-allowed;}
.x-spin2{display:inline-block;width:11px;height:11px;border:2px solid var(--mute);border-top-color:transparent;border-radius:50%;animation:x-rot .7s linear infinite;margin-right:7px;vertical-align:-1px;}
.x-flow{display:flex;align-items:flex-start;justify-content:space-between;gap:2px;margin:6px 0 18px;}
.x-fnode{display:flex;flex-direction:column;align-items:center;gap:9px;flex:1;text-align:center;min-width:0;}
.x-ficon{width:50px;height:50px;border-radius:13px;border:1.5px solid var(--sig);display:flex;align-items:center;justify-content:center;background:var(--card2);flex-shrink:0;}
.x-flabel{font-size:10.5px;color:var(--mute);line-height:1.35;max-width:82px;}
.x-farrow{display:flex;align-items:center;justify-content:center;font-size:18px;height:50px;flex-shrink:0;opacity:.65;}
.x-nudge{position:fixed;right:22px;bottom:96px;width:256px;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:14px 14px 13px;box-shadow:0 14px 44px rgba(0,0,0,.55);z-index:61;animation:x-nudgein .45s cubic-bezier(.2,1.2,.4,1);}
.x-nudge::after{content:"";position:absolute;right:24px;bottom:-7px;width:13px;height:13px;background:var(--card);border-right:1px solid var(--line);border-bottom:1px solid var(--line);transform:rotate(45deg);}
@keyframes x-nudgein{from{opacity:0;transform:translateY(12px) scale(.95);}to{opacity:1;transform:none;}}
.x-nudgex{position:absolute;top:7px;right:10px;background:none;border:none;color:var(--mute);font-size:17px;cursor:pointer;line-height:1;}
.x-nudgex:hover{color:var(--ink);}
.x-nudgemsg{font-size:13px;line-height:1.5;color:var(--ink);margin-bottom:11px;padding-right:14px;}
.x-nudgecta{background:var(--sig);color:#04201A;border:none;border-radius:8px;padding:8px 13px;font-family:ui-monospace,monospace;font-size:11px;font-weight:700;text-transform:uppercase;cursor:pointer;}
.x-nudgecta:hover{transform:translateY(-1px);}
.x-tabs{display:flex;gap:6px;background:var(--card);border:1px solid var(--line);border-radius:12px;padding:5px;margin-top:22px;position:sticky;top:12px;z-index:20;}
.x-tab{flex:1;background:none;border:none;color:var(--mute);border-radius:8px;padding:10px 8px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;transition:background .15s,color .15s;letter-spacing:.01em;}
.x-tab:hover{color:var(--ink);}
.x-tab.on{background:var(--sig);color:#04201A;}
.x-panelfade{animation:x-fade .28s ease;}
@keyframes x-fade{from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:none;}}
.x-glance{display:flex;flex-wrap:wrap;gap:7px;justify-content:center;margin-top:14px;}
.x-gchip{font-family:ui-monospace,monospace;font-size:11px;text-transform:capitalize;color:var(--mute);border:1px solid var(--line);border-radius:999px;padding:4px 11px;letter-spacing:.02em;}
.x-launcher{position:fixed;right:22px;bottom:22px;width:60px;height:60px;border-radius:50%;background:var(--sig);border:none;cursor:pointer;box-shadow:0 8px 28px rgba(56,200,154,.35),0 6px 20px rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;z-index:60;transition:transform .15s;animation:x-pop .5s cubic-bezier(.2,1.3,.4,1);}
.x-launcher:hover{transform:translateY(-2px) scale(1.05);}
.x-launcher::after{content:"";position:absolute;inset:0;border-radius:50%;border:2px solid var(--sig);animation:x-pulse 2.6s ease-out infinite;pointer-events:none;}
@keyframes x-pop{0%{transform:scale(0) rotate(-12deg);}70%{transform:scale(1.14);}100%{transform:scale(1);}}
@keyframes x-pulse{0%{transform:scale(1);opacity:.55;}70%{transform:scale(1.55);opacity:0;}100%{opacity:0;}}
.x-tip{position:absolute;right:74px;top:50%;background:var(--card);border:1px solid var(--line);color:var(--ink);font-size:12.5px;font-weight:500;padding:9px 13px;border-radius:11px;white-space:nowrap;box-shadow:0 8px 24px rgba(0,0,0,.45);animation:x-tipfade 7s ease forwards;}
.x-tip::after{content:"";position:absolute;right:-6px;top:50%;transform:translateY(-50%) rotate(45deg);width:10px;height:10px;background:var(--card);border-right:1px solid var(--line);border-top:1px solid var(--line);}
@keyframes x-tipfade{0%{opacity:0;transform:translateY(-50%) translateX(8px);}9%{opacity:1;transform:translateY(-50%) translateX(0);}82%{opacity:1;transform:translateY(-50%) translateX(0);}100%{opacity:0;transform:translateY(-50%) translateX(8px);visibility:hidden;pointer-events:none;}}
.x-panel{position:fixed;right:22px;bottom:22px;width:380px;max-width:calc(100vw - 32px);height:564px;max-height:calc(100vh - 44px);background:var(--card);border:1px solid var(--line);border-radius:16px;box-shadow:0 16px 54px rgba(0,0,0,.55);display:flex;flex-direction:column;z-index:60;overflow:hidden;}
.x-panelhead{display:flex;justify-content:space-between;align-items:center;padding:14px 16px;border-bottom:1px solid var(--line);flex-shrink:0;}
.x-paneltitle{font-weight:650;font-size:15px;display:flex;align-items:center;gap:8px;}
.x-ai{font-family:ui-monospace,monospace;font-size:10px;color:var(--sig);border:1px solid var(--line);border-radius:5px;padding:2px 6px;letter-spacing:.1em;}
.x-panelx{background:none;border:none;color:var(--mute);font-size:24px;cursor:pointer;line-height:1;padding:0 4px;}
.x-panelx:hover{color:var(--ink);}
.x-chatpanel{flex:1;max-height:none;margin-bottom:0;padding:14px 16px;}
.x-panelfoot{padding:12px 16px;border-top:1px solid var(--line);flex-shrink:0;}
.x-panelfoot .x-chips{margin-bottom:9px;}
@media print{.x-actions,.x-foot,.x-consent{display:none;}.x-root{background:#fff;}}
`;

async function sha1Hex(str) {
  const buf = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[0-9][0-9\s\-().]{6,}$/;
function classify(v) {
  const s = v.trim();
  if (!s) return "empty";
  if (EMAIL_RE.test(s)) return "email";
  if (PHONE_RE.test(s)) return "phone";
  return "password";
}
const KIND_LABEL = { email: "email address", phone: "phone number", password: "password", empty: "" };

function severityFor(dataClasses) {
  const dc = (dataClasses || []).map((s) => s.toLowerCase());
  const hasPw = dc.some((s) => s.includes("password"));
  const hasFin = dc.some((s) => s.includes("credit") || s.includes("bank") || s.includes("payment") || s.includes("financial"));
  const hasContact = dc.some((s) => s.includes("phone") || s.includes("address"));
  if (hasPw && hasFin) return 1.0;
  if (hasPw) return 0.7;
  if (hasContact) return 0.4;
  return 0.2;
}

// Aggregate what identity attributes are exposed across breaches (mosaic).
const ATTR_DEFS = [
  { key: "email", label: "Email", match: /email/i },
  { key: "password", label: "Password", match: /password/i },
  { key: "phone", label: "Phone", match: /phone/i },
  { key: "address", label: "Address", match: /address/i },
  { key: "username", label: "Username", match: /username|handle|screen/i },
  { key: "financial", label: "Financial", match: /credit|bank|payment|financial/i },
];

function buildReport(kind, opts) {
  const { credLeaked, credCount, acctLeaked, breaches } = opts;
  const attrs = new Set();
  const classCounts = {};
  let score = 0;

  if (kind === "password" && credLeaked) {
    attrs.add("password");
    const prevalence = Math.min(1, Math.log10(credCount + 1) / 7);
    score = Math.round(0.7 * (0.5 + 0.5 * prevalence) * 100);
  }

  const scored = [];
  if ((kind === "email" || kind === "phone") && acctLeaked) {
    let raw = 0;
    const nowY = new Date().getFullYear();
    for (const b of breaches) {
      for (const dc of b.dataClasses || []) {
        classCounts[dc] = (classCounts[dc] || 0) + 1;
        for (const a of ATTR_DEFS) if (a.match.test(dc)) attrs.add(a.key);
      }
      const sev = severityFor(b.dataClasses);
      const year = b.year ? parseInt(b.year, 10) : null;
      const ageDays = year ? Math.max(0, (nowY - year) * 365) : 1500;
      const rec = Math.exp(-0.002 * ageDays);
      const contribution = sev * rec;
      raw += contribution;
      scored.push({ ...b, sev, rec, contribution, year });
    }
    score = Math.round(Math.min(1, raw / 0.8) * 100);
  }

  score = Math.max(score, (credLeaked || acctLeaked) ? 1 : 0);
  let level;
  if (!(credLeaked || acctLeaked)) level = "safe";
  else if (score <= 35) level = "low";
  else if (score <= 65) level = "medium";
  else level = "high";

  return { score, level, attrs, classCounts, scored };
}

// ---- ExpoBot rule-based remediation (thesis format) ----
function remediation(attrs, meta) {
  const out = [];
  if (attrs.has("password")) out.push({
    category: "Credential Security",
    finding: "Passwords tied to your identity appear in breach data — the leading vector for account takeover via reuse.",
    steps: ["Change this password everywhere it was used.", "Use a password manager to generate a unique passphrase per site.", "Enable app-based two-factor authentication (not SMS).", "Never reuse a breached password again."],
    reduction: "high impact",
  });
  if (attrs.has("financial")) out.push({
    category: "Financial Protection",
    finding: "Payment or financial data was exposed, enabling fraud and unauthorised charges.",
    steps: ["Review recent card and bank statements for unfamiliar charges.", "Request a replacement card if anything looks wrong.", "Consider a credit freeze with the credit bureaus."],
    reduction: "high impact",
  });
  if (attrs.has("email")) out.push({
    category: "Phishing Defence",
    finding: "Your email is exposed and can be targeted with tailored phishing that references real breach details.",
    steps: ["Treat unexpected messages with urgency or links as suspect.", "Verify senders independently before acting.", "Consider an email alias for sign-ups."],
    reduction: "medium impact",
  });
  if (attrs.has("phone")) out.push({
    category: "SIM & Smishing Defence",
    finding: "Your phone number is exposed, enabling SIM-swap attacks and text-based (smishing) fraud.",
    steps: ["Add a SIM-swap / port-out PIN with your mobile carrier.", "Prefer app-based 2FA over SMS codes.", "Ignore unsolicited texts asking you to click or call."],
    reduction: "medium impact",
  });
  if (attrs.has("address") || attrs.has("username")) out.push({
    category: "Identity & Linkage",
    finding: "Address or username fragments let separate profiles be linked into one identity.",
    steps: ["Use distinct usernames across accounts you want kept separate.", "Limit public sharing of your home address.", "Search your name periodically to see what's discoverable."],
    reduction: "low–medium impact",
  });
  out.push({
    category: "Ongoing Monitoring",
    finding: "Exposure changes over time as new breaches surface.",
    steps: ["Turn on breach notifications for your key email addresses.", "Re-check your exposure periodically.", "Rotate credentials on a schedule for critical accounts."],
    reduction: "preventive",
  });
  return out;
}

function howLeaked(attrs, count) {
  const items = [{
    title: "Database breaches",
    body: "Companies you had accounts with were compromised and their user databases stolen. Your data appears because you had an account there — not because you did anything wrong.",
  }];
  if (attrs.has("password")) items.push({
    title: "Credential dumps & stealer logs",
    body: "Exposed passwords are collected into massive combolists and traded. Info-stealer malware on infected devices also harvests saved credentials directly from browsers.",
  });
  items.push({
    title: "Aggregation over time",
    body: `Your identity surfaces across ${count > 1 ? count + " separate breaches" : "breach sources"}. Individually minor, together they form a fuller picture — the effect this report measures.`,
  });
  return items;
}

function howWeaponised(attrs) {
  const items = [];
  if (attrs.has("password")) items.push({
    title: "Credential stuffing → account takeover",
    body: "Attackers replay leaked email+password pairs against banking, email, and shopping sites, betting on reuse. One reused password can unlock many accounts.",
  });
  if (attrs.has("email")) items.push({
    title: "Targeted phishing",
    body: "Knowing which services you use, attackers craft convincing messages that impersonate those exact brands to steal logins or payment details.",
  });
  if (attrs.has("phone")) items.push({
    title: "SIM swapping",
    body: "With your number and some personal detail, an attacker can socially engineer your carrier into moving your number to their SIM — intercepting SMS 2FA codes.",
  });
  if (attrs.has("financial")) items.push({
    title: "Payment fraud & identity theft",
    body: "Financial data supports direct fraud and, combined with your name and address, opening accounts or loans in your name.",
  });
  items.push({
    title: "Mosaic re-identification",
    body: "The real risk is combination: fragments from different breaches are linked to build a single, detailed profile of you — the basis of modern targeted attacks.",
  });
  return items;
}

// Self-check footprint guidance. The app does NOT profile anyone or fetch
// third-party data — it shows the user how to inspect their own public footprint,
// consistent with the thesis scope (no automated third-party data processing).
function footprint(attrs, identifier, kind) {
  const items = [];
  if ((kind === "email" || kind === "phone") && identifier) {
    items.push({
      title: "Search engines",
      body: "See what a search engine surfaces for your " + kind + ". Attackers start here to connect your identifier to public profiles and posts.",
      action: { label: "Search my " + kind, url: "https://www.google.com/search?q=" + encodeURIComponent('"' + identifier + '"') },
    });
  }
  if (attrs.has("username")) items.push({
    title: "Username reuse",
    body: "Your usernames appear in breach data. If you reuse the same handle across platforms, those profiles can be linked together. Search the platforms you use for your handles and diversify the ones you want kept separate.",
  });
  if (attrs.has("email")) items.push({
    title: "Connected accounts",
    body: "Many sites reveal whether an email has an account during password reset. Review which services are tied to this email and close the ones you no longer use.",
  });
  items.push({
    title: "Data brokers",
    body: "People-search and broker sites compile public records with breach data into profiles. Search the major brokers for your name and use their opt-out forms to request removal.",
  });
  items.push({
    title: "Photos & metadata",
    body: "Public photos can carry GPS metadata and enable reverse-image linkage. Strip EXIF data before posting and review images you're tagged in.",
  });
  return items;
}

function buildContext(report, meta) {
  const L = [];
  L.push("Exposure score: " + report.score + "/100 (band: " + report.level + ")");
  if (meta.kind === "password") {
    L.push("Check type: password. Appears in breach dumps " + (meta.credCount || 0) + " times.");
  } else {
    L.push("Identifier type: " + meta.kind);
    L.push("Breaches found: " + report.scored.length);
    if (report.scored.length) L.push("Breached companies: " + report.scored.map((b) => b.title).join(", "));
    L.push("Data types exposed: " + ([...report.attrs].join(", ") || "none"));
  }
  if (meta.sources && meta.sources.length) L.push("Sources checked: " + meta.sources.join(", "));
  return L.join("\n");
}

const BAND = {
  safe: { c: "var(--sig)", label: "Safe", head: "No exposure found" },
  low: { c: "var(--sig)", label: "Low", head: "Limited exposure" },
  medium: { c: "var(--amber)", label: "Medium", head: "Notable exposure" },
  high: { c: "var(--coral)", label: "High", head: "Significant exposure" },
};

function Icon({ name, color }) {
  const c = color || "var(--sig)";
  const cm = { viewBox: "0 0 24 24", width: 24, height: 24, fill: "none", stroke: c, strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round" };
  switch (name) {
    case "person": return <svg {...cm}><circle cx="12" cy="8" r="3.4" /><path d="M5.5 20c0-3.6 3-5.6 6.5-5.6s6.5 2 6.5 5.6" /></svg>;
    case "building": return <svg {...cm}><rect x="6" y="3.5" width="12" height="17" rx="1" /><path d="M9.5 7.5h1M13.5 7.5h1M9.5 11h1M13.5 11h1M9.5 14.5h1M13.5 14.5h1" /></svg>;
    case "db": return <svg {...cm}><ellipse cx="12" cy="6" rx="6.5" ry="2.6" /><path d="M5.5 6v11c0 1.5 2.9 2.6 6.5 2.6s6.5-1.1 6.5-2.6V6" /><path d="M5.5 11.5c0 1.5 2.9 2.6 6.5 2.6s6.5-1.1 6.5-2.6" /></svg>;
    case "layers": return <svg {...cm}><path d="M12 3l8.5 4.2L12 11.4 3.5 7.2z" /><path d="M4 12l8 4 8-4" /></svg>;
    case "key": return <svg {...cm}><circle cx="8" cy="14" r="3.6" /><path d="M10.6 11.4L19 3M15.5 6.5l2 2M13.5 8.5l2 2" /></svg>;
    case "target": return <svg {...cm}><circle cx="12" cy="12" r="7" /><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></svg>;
    case "unlock": return <svg {...cm}><rect x="5.5" y="11" width="13" height="8.5" rx="2" /><path d="M9 11V8a3 3 0 0 1 5.7-1.3" /></svg>;
    default: return null;
  }
}

function FlowDiagram({ steps, color }) {
  return (
    <div className="x-flow">
      {steps.map((st, i) => (
        <React.Fragment key={i}>
          <div className="x-fnode">
            <div className="x-ficon" style={{ borderColor: color }}><Icon name={st.icon} color={color} /></div>
            <div className="x-flabel">{st.label}</div>
          </div>
          {i < steps.length - 1 && <div className="x-farrow" style={{ color }}>→</div>}
        </React.Fragment>
      ))}
    </div>
  );
}

const LEAK_FLOW = [
  { icon: "person", label: "You sign up" },
  { icon: "building", label: "Company breached" },
  { icon: "db", label: "Data dumped & sold" },
  { icon: "layers", label: "Profile aggregated" },
];
const ATTACK_FLOW = [
  { icon: "key", label: "Leaked login" },
  { icon: "target", label: "Tried on many sites" },
  { icon: "unlock", label: "Account taken over" },
];

function sevLabel(sv) { return sv >= 1 ? "Financial" : sv >= 0.7 ? "Credentials" : sv >= 0.4 ? "Contact" : "Email"; }

function Gauge({ score, level }) {
  const S = level === "safe" ? 0 : Math.max(0, Math.min(100, Math.round(score)));
  const Cx = 160, Cy = 150, R = 118, SW = 24, N = 9, gap = 2.4, seg = 180 / N;
  const ramp = ["#2FBF71", "#57C559", "#8CCB44", "#C0CE3B", "#E7C93B", "#E9A93C", "#E8843F", "#E76A45", "#E5544A"];
  const P = (ang, r = R) => { const t = ang * Math.PI / 180; return [Cx + r * Math.cos(t), Cy - r * Math.sin(t)]; };
  const arcs = [];
  for (let k = 0; k < N; k++) {
    const a0 = 180 - k * seg - gap / 2;
    const a1 = 180 - (k + 1) * seg + gap / 2;
    const [x0, y0] = P(a0), [x1, y1] = P(a1);
    arcs.push(<path key={k} d={"M " + x0.toFixed(1) + " " + y0.toFixed(1) + " A " + R + " " + R + " 0 0 1 " + x1.toFixed(1) + " " + y1.toFixed(1)} stroke={ramp[k]} strokeWidth={SW} fill="none" strokeLinecap="round" />);
  }
  const nAng = 180 - (S / 100) * 180;
  const [tx, ty] = P(nAng, R - 4);
  const [b1x, b1y] = P(nAng + 90, 7);
  const [b2x, b2y] = P(nAng - 90, 7);
  const bandColor = ramp[Math.min(N - 1, Math.floor((S / 100) * N))];
  return (
    <svg viewBox="0 0 320 224" style={{ width: "100%", maxWidth: 340, display: "block", margin: "0 auto" }}>
      <defs><filter id="nsh" x="-60%" y="-60%" width="220%" height="220%"><feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000" floodOpacity="0.55" /></filter></defs>
      {arcs}
      <polygon points={tx.toFixed(1) + "," + ty.toFixed(1) + " " + b1x.toFixed(1) + "," + b1y.toFixed(1) + " " + b2x.toFixed(1) + "," + b2y.toFixed(1)} fill="#EAF1FA" filter="url(#nsh)" />
      <circle cx={Cx} cy={Cy} r="13" fill="#0F1521" stroke={bandColor} strokeWidth="3.5" />
      <circle cx={Cx} cy={Cy} r="4.5" fill={bandColor} />
      <text x={Cx} y="200" textAnchor="middle" fontFamily="ui-monospace,monospace" fontSize="38" fontWeight="700" fill={bandColor}>{S}</text>
      <text x={Cx} y="216" textAnchor="middle" fontFamily="ui-monospace,monospace" fontSize="10" fill="#67748B">/ 100</text>
      <text x="30" y="176" fontFamily="ui-monospace,monospace" fontSize="9" fill="#2FBF71">SAFE</text>
      <text x="290" y="176" textAnchor="end" fontFamily="ui-monospace,monospace" fontSize="9" fill="#E5544A">CRITICAL</text>
    </svg>
  );
}

function Bars({ counts, color }) {
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return null;
  const max = Math.max(...entries.map((e) => e[1]));
  return (
    <div>
      {entries.map(([label, n]) => (
        <div className="x-bar" key={label}>
          <span className="bl">{label.replace(/ addresses| numbers/i, "")}</span>
          <span className="bt"><span className="bf" style={{ width: (n / max * 100) + "%", background: color }} /></span>
          <span className="bv">{n}</span>
        </div>
      ))}
    </div>
  );
}

function Timeline({ scored, color }) {
  const dated = scored.filter((b) => b.year);
  if (dated.length === 0) return <div className="x-secd">Breach dates weren't available from this source.</div>;
  const years = dated.map((b) => b.year);
  const min = Math.min(...years, new Date().getFullYear() - 1);
  const max = new Date().getFullYear();
  const span = Math.max(1, max - min);
  return (
    <svg viewBox="0 0 100 22" style={{ width: "100%", height: 60 }} preserveAspectRatio="none">
      <line x1="2" y1="14" x2="98" y2="14" stroke="var(--line)" strokeWidth="0.4" />
      {[min, Math.round((min + max) / 2), max].map((y, i) => (
        <text key={i} x={2 + (i * 48)} y="21" fontSize="3" fill="var(--mute)" fontFamily="monospace">{y}</text>
      ))}
      {dated.map((b, i) => {
        const x = 2 + ((b.year - min) / span) * 96;
        const r = 1.4 + b.sev * 1.6;
        return <circle key={i} cx={x} cy="14" r={r} fill={color} opacity="0.85" />;
      })}
    </svg>
  );
}

export default function Page() {
  const [consent, setConsent] = useState(false);
  const [value, setValue] = useState("");
  const [state, setState] = useState("idle");
  const [report, setReport] = useState(null);
  const [meta, setMeta] = useState(null);
  const [err, setErr] = useState("");
  const [chatMsgs, setChatMsgs] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [tab, setTab] = useState("overview");
  const [nudge, setNudge] = useState(false);
  const [lang, setLang] = useState("en");
  const L = STR[lang];
  const chatRef = useRef(null);
  useEffect(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight; }, [chatMsgs, chatBusy, chatOpen]);
  useEffect(() => {
    if (state === "done" && report && meta && !meta.unavailable && !chatOpen) {
      const t = setTimeout(() => setNudge(true), 3500);
      return () => clearTimeout(t);
    }
    setNudge(false);
  }, [state, report, meta, chatOpen]);

  const kind = useMemo(() => classify(value), [value]);
  const reset = () => { setValue(""); setState("idle"); setReport(null); setMeta(null); setErr(""); setChatMsgs([]); setChatInput(""); setChatOpen(false); setTab("overview"); };

  const run = async () => {
    if (!value.trim()) return;
    setState("loading"); setErr(""); setReport(null);
    try {
      let credLeaked = null, credCount = 0, acctLeaked = null, breaches = [], sources = [], unavailable = false;

      if (kind === "password") {
        const hash = await sha1Hex(value);
        const res = await fetch("https://api.pwnedpasswords.com/range/" + hash.slice(0, 5));
        if (!res.ok) throw new Error("Password service unreachable.");
        const body = await res.text();
        const suffix = hash.slice(5);
        for (const line of body.split("\n")) {
          const [suf, c] = line.trim().split(":");
          if (suf === suffix) { credCount = parseInt(c, 10) || 0; break; }
        }
        credLeaked = credCount > 0;
      } else {
        const res = await fetch("/api/breach", {
          method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({ email: kind === "email" ? value.trim() : undefined, phone: kind === "phone" ? value.trim() : undefined }),
        });
        const data = await res.json();
        if (res.status === 503 || data.configured === false) unavailable = true;
        else if (!res.ok) throw new Error(data.error || "Lookup failed.");
        else { breaches = data.breaches || []; acctLeaked = breaches.length > 0; sources = data.sources || []; }
      }

      const r = buildReport(kind, { credLeaked, credCount, acctLeaked, breaches });
      setReport(r);
      setMeta({ kind, credCount, count: breaches.length, sources, unavailable, credLeaked, acctLeaked, identifier: kind === "password" ? null : value.trim() });
      setTab("overview");
      setState("done");
      if (kind === "password") setValue("");
    } catch (e) {
      setErr(String(e.message || e)); setState("error");
    }
  };

  const sendChat = async (text) => {
    const q = (text || chatInput).trim();
    if (!q || chatBusy) return;
    const next = [...chatMsgs, { role: "user", content: q }];
    setChatMsgs(next); setChatInput(""); setChatBusy(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ context: buildContext(report, meta), messages: next, language: LANG_NAME[lang] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Assistant failed.");
      setChatMsgs([...next, { role: "assistant", content: data.reply }]);
    } catch (e) {
      setChatMsgs([...next, { role: "assistant", content: "Sorry — I couldn't respond (" + (e.message || e) + ")." }]);
    } finally {
      setChatBusy(false);
    }
  };

  const leaked = report && (meta.credLeaked || meta.acctLeaked);
  const band = report ? { c: BAND[report.level].c, label: L.bands[report.level], head: L.heads[report.level] } : null;

  return (
    <div className="x-root">
      <style>{STYLE}</style>
      <div className="x-wrap">
        <div className="x-langbar">
          {LANGS.map((lg) => (
            <button key={lg.code} className={"x-langbtn" + (lang === lg.code ? " on" : "")} onClick={() => setLang(lg.code)} title={lg.name}>{lg.label}</button>
          ))}
        </div>
        <div className="x-brand">Exposio</div>
        <h1 className="x-title">{L.title}</h1>
        <p className="x-lede">{L.lede}</p>

        {state !== "done" && (
          <div className="x-card">
            <label className="x-label">{L.inputLabel}</label>
            <input className="x-input" type={kind === "password" ? "password" : "text"} value={value}
              placeholder={L.placeholder} onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && consent && run()} autoComplete="off" disabled={!consent} />
            <div className="x-kind">{value.trim() ? <>{L.detected}: <b>{L[kind === "email" ? "kEmail" : kind === "phone" ? "kPhone" : "kPassword"]}</b></> : "\u00A0"}</div>
            <button className="x-btn" onClick={run} disabled={!consent || state === "loading" || !value.trim()}>
              {state === "loading" ? <><span className="x-spin" />{L.checking}</> : L.run}
            </button>
            {state === "error" && <div className="x-err">{err}</div>}
            <label className="x-consent">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
              <span>{L.consent[0]}<b>{L.consent[1]}</b>{L.consent[2]}</span>
            </label>
          </div>
        )}

        {state === "done" && report && (
          <>
            {/* Hero: score */}
            <div className="x-card">
              <div className="x-hero">
                {meta.unavailable ? (
                  <>
                    <div className="x-gauge"><div style={{ borderRadius: "50%", width: "100%", height: "100%", background: "var(--line)", WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 11px), #000 calc(100% - 11px))", mask: "radial-gradient(farthest-side, transparent calc(100% - 11px), #000 calc(100% - 11px))" }} /><div className="x-gnum"><span className="x-gval" style={{ color: "var(--mute)" }}>–</span><span className="x-gof">/ 100</span></div></div>
                    <div className="x-band" style={{ color: "var(--mute)" }}>Not checked</div>
                    <div className="x-hhead">Breach source not enabled</div>
                    <div className="x-hsub">No breach-intelligence key is configured, so this address wasn't checked. Add a DeHashed or HIBP key to enable real lookups. Meanwhile, check free at haveibeenpwned.com.</div>
                  </>
                ) : (
                  <>
                    <Gauge score={report.score} color={band.c} level={report.level} />
                    <div className="x-band" style={{ color: band.c }}>{band.label}</div>
                    <div className="x-hhead">{band.head}</div>
                    <div className="x-hsub">
                      {leaked
                        ? "Your Exposure Score reflects the breach data found. The sections below explain the risk and what to do."
                        : "No match in the breach sources checked. Keep yourself safe: unique passwords per site and two-factor authentication everywhere."}
                    </div>
                    {leaked && (
                      <div className="x-glance">
                        {meta.kind !== "password" && <span className="x-gchip">{report.scored.length} {report.scored.length > 1 ? L.breaches : L.breach}</span>}
                        {[...report.attrs].slice(0, 4).map((k) => <span className="x-gchip" key={k}>{k}</span>)}
                      </div>
                    )}
                    {meta.sources && meta.sources.length > 0 && <div className="x-src">{L.sources}: {meta.sources.join(" + ")}</div>}
                  </>
                )}
              </div>
            </div>

            {leaked && !meta.unavailable && (
              <>
                {/* Tab navigation */}
                <div className="x-tabs">
                  {[["overview", L.tabs.overview], ["details", L.tabs.details], ["actions", L.tabs.actions], ["learn", L.tabs.learn]].map(([id, label]) => (
                    <button key={id} className={"x-tab" + (tab === id ? " on" : "")} onClick={() => setTab(id)}>{label}</button>
                  ))}
                </div>

                {tab === "overview" && (<div className="x-panelfade">
                {/* Score model — plain-English explanation + weighting rules */}
                {meta.kind !== "password" && report.scored.length > 0 && (() => {
                  const rows = [...report.scored].sort((a, b) => b.contribution - a.contribution);
                  const maxC = Math.max(...rows.map((r) => r.contribution), 0.0001);
                  const a = report.attrs;
                  const n = rows.length;
                  const lower = [];
                  if (a.has("email")) lower.push("email");
                  if (a.has("phone")) lower.push("phone");
                  if (a.has("address")) lower.push("address");
                  if (a.has("username")) lower.push("username");
                  const lowerTxt = lower.length ? lower.join(", ") : "contact";
                  let why;
                  if (a.has("password") || a.has("financial")) {
                    const strong = [];
                    if (a.has("financial")) strong.push("financial data");
                    if (a.has("password")) strong.push("passwords");
                    why = "Your data appears in " + n + " breach" + (n > 1 ? "es" : "") + ". Because " + strong.join(" and ") + " " + (strong.length > 1 ? "were" : "was") + " exposed, the risk of account takeover and fraud is high — which is what drives the score up.";
                  } else {
                    why = "Your data appears in " + n + " breach" + (n > 1 ? "es" : "") + ", but only " + lowerTxt + " information was exposed — no passwords and no financial data. That keeps account-takeover risk low, so the score stays in the lower range. Older breaches also count for less over time.";
                  }
                  const tiers = [
                    { label: "Financial (passwords + payment data)", w: "1.0", on: a.has("financial") },
                    { label: "Credentials (passwords, no payment)", w: "0.7", on: a.has("password") && !a.has("financial") },
                    { label: "Contact (phone or address)", w: "0.4", on: (a.has("phone") || a.has("address")) && !a.has("password") },
                    { label: "Email only", w: "0.2", on: !a.has("phone") && !a.has("address") && !a.has("password") && a.has("email") },
                  ];
                  return (
                    <div className="x-card">
                      <div className="x-sech"><span className="x-secn">01</span><span className="x-sect">Score model</span></div>
                      <div className="x-secd">How this score was reached — and the weighting behind it.</div>
                      <div className="x-explain" style={{ borderLeft: "3px solid " + band.c }}>{why}</div>
                      <div className="x-lglabel">Severity weighting — worse data types raise the score more:</div>
                      <div className="x-legend">
                        {tiers.map((t, i) => (
                          <div className={"x-lgrow" + (t.on ? " on" : "")} key={i}>
                            <span className="ll"><span className="ldot" style={{ background: t.on ? band.c : "var(--line)" }} />{t.label}</span>
                            <span className="lw">{t.w}{t.on ? " · in your result" : ""}</span>
                          </div>
                        ))}
                      </div>
                      <div className="x-btable">
                        <div className="x-btrow x-bthead"><span>Company</span><span>Year</span><span>Type</span><span>Weight</span></div>
                        {rows.map((b, i) => (
                          <div className="x-btrow" key={i}>
                            <span className="c" title={b.title}>{b.title}</span>
                            <span>{b.year || "—"}</span>
                            <span>{sevLabel(b.sev)}</span>
                            <span className="contrib"><span className="cbar" style={{ width: (8 + (b.contribution / maxC) * 46) + "px", background: band.c }} />{b.contribution.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="x-btfoot"><span>Breaches found</span><span>{n}</span></div>
                      <div className="x-btfoot"><span>Exposure Score</span><span style={{ color: band.c }}>{report.score} / 100</span></div>
                    </div>
                  );
                })()}
                </div>)}

                {tab === "details" && (<div className="x-panelfade">
                {/* Breakdown */}
                <div className="x-card">
                  <div className="x-sech"><span className="x-secn">01</span><span className="x-sect">Exposure breakdown</span></div>
                  <div className="x-secd">What kinds of your data appear, and how often, across the breaches found.</div>
                  {meta.kind === "password" ? (
                    <div className="x-bar"><span className="bl">Breach dumps</span><span className="bt"><span className="bf" style={{ width: "100%", background: band.c }} /></span><span className="bv">{meta.credCount.toLocaleString()}</span></div>
                  ) : (
                    <Bars counts={report.classCounts} color={band.c} />
                  )}
                </div>

                {/* Timeline (email/phone only) */}
                {meta.kind !== "password" && (
                  <div className="x-card">
                    <div className="x-sech"><span className="x-secn">02</span><span className="x-sect">Breach timeline</span></div>
                    <div className="x-secd">When the breaches occurred. Recent breaches weigh more — older ones decay in the score.</div>
                    <Timeline scored={report.scored} color={band.c} />
                  </div>
                )}

                {/* Mosaic */}
                <div className="x-card">
                  <div className="x-sech"><span className="x-secn">03</span><span className="x-sect">What can be assembled about you</span></div>
                  <div className="x-secd">The mosaic effect: separate fragments combine into one identity. Highlighted items are exposed.</div>
                  <div className="x-mosaic">
                    {ATTR_DEFS.map((a) => {
                      const on = report.attrs.has(a.key);
                      return (
                        <span className={"x-chip " + (on ? "on" : "off")} key={a.key}>
                          <span className="x-dot" style={{ background: on ? "var(--coral)" : "var(--mute)" }} />{a.label}
                        </span>
                      );
                    })}
                  </div>
                </div>

                </div>)}

                {tab === "actions" && (<div className="x-panelfade">
                {/* ExpoBot remediation */}
                <div className="x-card">
                  <div className="x-sech"><span className="x-secn">01</span><span className="x-sect">Actions to take</span></div>
                  <div className="x-secd">Prioritised, specific steps — each with its likely impact on your score.</div>
                  {remediation(report.attrs, meta).map((r, i) => (
                    <div className="x-remcard" key={i}>
                      <div className="x-remtop"><span className="x-remcat">{r.category}</span><span className="x-remred">{r.reduction}</span></div>
                      <div className="x-remfind">{r.finding}</div>
                      <ol className="x-remsteps">{r.steps.map((s, j) => <li key={j}>{s}</li>)}</ol>
                    </div>
                  ))}
                </div>

                </div>)}

                {tab === "learn" && (<div className="x-panelfade">
                {/* How it leaked */}
                <div className="x-card">
                  <div className="x-sech"><span className="x-secn">01</span><span className="x-sect">How your data leaked</span></div>
                  <div className="x-secd">The path your data takes from a signup form to an aggregated profile.</div>
                  <FlowDiagram steps={LEAK_FLOW} color={band.c} />
                  {howLeaked(report.attrs, meta.count).map((it, i) => (
                    <div className="x-info" key={i}><div className="x-infot">{it.title}</div><div className="x-infob">{it.body}</div></div>
                  ))}
                </div>

                {/* Attacker view */}
                <div className="x-card">
                  <div className="x-sech"><span className="x-secn">02</span><span className="x-sect">How attackers could use it</span></div>
                  <div className="x-secd">Awareness, not instructions — understanding the risk is how you defend against it.</div>
                  <FlowDiagram steps={ATTACK_FLOW} color={band.c} />
                  {howWeaponised(report.attrs).map((it, i) => (
                    <div className="x-info" key={i}><div className="x-infot">{it.title}</div><div className="x-infob">{it.body}</div></div>
                  ))}
                </div>

                {/* Your public footprint (self-check, no auto-profiling) */}
                <div className="x-card">
                  <div className="x-sech"><span className="x-secn">03</span><span className="x-sect">Your public footprint</span></div>
                  <div className="x-secd">What an attacker could piece together from public sources — and how to check it yourself.</div>
                  <div className="x-fpfound">
                    <div className="x-fpfoundh">Public information found</div>
                    <div className="x-fpfoundb">None retrieved. Exposio does not automatically profile people or fetch anyone's social posts or activity — that would process others' personal data. This stays blank by design; use the self-checks below to inspect your own footprint.</div>
                  </div>
                  {footprint(report.attrs, meta.identifier, meta.kind).map((it, i) => (
                    <div className="x-info" key={i}>
                      <div className="x-infot">{it.title}</div>
                      <div className="x-infob">{it.body}</div>
                      {it.action && <a className="x-fplink" href={it.action.url} target="_blank" rel="noopener noreferrer">{it.action.label} ↗</a>}
                    </div>
                  ))}
                </div>
                </div>)}
              </>
            )}

            <div className="x-actions">
              <button className="x-again" onClick={reset}>{L.checkAnother}</button>
              {leaked && !meta.unavailable && <button className="x-print" onClick={() => window.print()}>{L.printReport}</button>}
            </div>
          </>
        )}

        <div className="x-foot">
          {L.footer1}<br />
          Zero-storage · self-assessment only · MSc thesis prototype, Óbuda University
        </div>
      </div>

      {state === "done" && report && !meta.unavailable && (
        chatOpen ? (
          <div className="x-panel">
            <div className="x-panelhead">
              <span className="x-paneltitle"><span className="x-ai">AI</span> {L.botTitle}</span>
              <button className="x-panelx" onClick={() => setChatOpen(false)} aria-label="Close">×</button>
            </div>
            <div className="x-chat x-chatpanel" ref={chatRef}>
              <div className="x-msg bot">Hi! I’m ExpoBot. I’ve read your exposure report — ask me what to do, or tap a suggestion below.</div>
              {chatMsgs.map((m, i) => (<div className={"x-msg " + (m.role === "user" ? "me" : "bot")} key={i}>{m.content}</div>))}
              {chatBusy && <div className="x-msg bot"><span className="x-spin2" />{L.thinking}</div>}
            </div>
            <div className="x-panelfoot">
              <div className="x-chips">
                {L.botChips.map((q, i) => (
                  <button className="x-chip2" key={i} onClick={() => sendChat(q)} disabled={chatBusy}>{q}</button>
                ))}
              </div>
              <div className="x-chatin">
                <input className="x-input" value={chatInput} onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendChat()} placeholder={L.botPlaceholder} disabled={chatBusy} />
                <button className="x-send" onClick={() => sendChat()} disabled={chatBusy || !chatInput.trim()}>{L.send}</button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {nudge && (
              <div className="x-nudge">
                <button className="x-nudgex" onClick={() => setNudge(false)} aria-label="Dismiss">×</button>
                <div className="x-nudgemsg">{L.nudge}</div>
                <button className="x-nudgecta" onClick={() => { setNudge(false); setChatOpen(true); sendChat(L.nudgeAsk); }}>{L.nudgeCta} →</button>
              </div>
            )}
          <button className="x-launcher" onClick={() => setChatOpen(true)} aria-label="Open ExpoBot">
            <span className="x-tip">Ask ExpoBot</span>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v7A2.5 2.5 0 0 1 17.5 15H9l-4 4v-4H6.5A2.5 2.5 0 0 1 4 12.5v-7Z" fill="#04201A"/><circle cx="9" cy="9.2" r="1.15" fill="#38C89A"/><circle cx="12" cy="9.2" r="1.15" fill="#38C89A"/><circle cx="15" cy="9.2" r="1.15" fill="#38C89A"/></svg>
          </button>
          </>
        )
      )}
    </div>
  );
}
