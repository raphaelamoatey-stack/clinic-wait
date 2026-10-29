const CONFIG = {
  phone: "+41 76 320 02 83",         // clinic phone, shown when data is missing
  staleMinutes: 30,
  maxWait: 480,
  hours: { 1: [8, 18], 2: [8, 18], 3: [8, 18], 4: [8, 22], 5: [8, 17], 6: [9, 13] }, // 0 = Sunday, closed
  voiceLangs: ["de", "fr"]          // languages a phone call hears, in order
};
const LANGS = ["en", "de", "fr", "it"];
const DAYS = {
  en: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  de: ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"],
  fr: ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"],
  it: ["domenica", "lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato"]
};
// spoken: changes for phone calls (full words instead of abbreviations).
// day: how a weekday reads after "Opens"; at: the opening hour (clinic hours are whole hours).
const TEXT = {
  en: { spoken: t => t, voice: "en-GB", name: "English", keyword: "WAIT", title: "Current wait", zero: "No wait right now. Walk in.", wait: m => "About " + m + " minutes",
        upd: m => "Updated " + m + " min ago", stale: "This estimate may be out of date. Call to confirm.",
        closed: "The clinic is closed now.", opens: s => "Opens " + s, today: "today", day: d => d,
        at: h => " at " + (h % 12 || 12) + (h < 12 ? " AM" : " PM"),
        nodata: "Wait time is not available right now. Please call.", sms: p => "No internet? Text WAIT to " + p + "." },
  de: { spoken: t => t.replace(/(\d+) Min\./, (_, m) => m + (m === "1" ? " Minute." : " Minuten.")), voice: "de-DE", name: "Deutsch", keyword: "WARTEN", title: "Aktuelle Wartezeit", zero: "Keine Wartezeit. Kommen Sie vorbei.", wait: m => "Etwa " + m + " Minuten",
        upd: m => "Aktualisiert vor " + m + " Min.", stale: "Diese Angabe ist vielleicht veraltet. Bitte rufen Sie an.",
        closed: "Die Klinik ist jetzt geschlossen.", opens: s => "Öffnet " + s, today: "heute", day: d => "am " + d,
        at: h => " um " + h + ":00",
        nodata: "Die Wartezeit ist im Moment nicht verfügbar. Bitte rufen Sie an.", sms: p => "Kein Internet? Senden Sie WARTEN an " + p + "." },
  fr: { spoken: t => t, voice: "fr-FR", name: "Français", keyword: "ATTENTE", title: "Attente actuelle", zero: "Pas d'attente en ce moment. Venez directement.", wait: m => "Environ " + m + " minutes",
        upd: m => "Mis à jour il y a " + m + " min", stale: "Cette estimation pourrait dater. Appelez pour confirmer.",
        closed: "La clinique est fermée.", opens: s => "Ouvre " + s, today: "aujourd'hui", day: d => d,
        at: h => " à " + h + " h",
        nodata: "Le temps d'attente n'est pas disponible pour le moment. Veuillez appeler.", sms: p => "Pas d'internet ? Envoyez ATTENTE au " + p + "." },
  it: { spoken: t => t, voice: "it-IT", name: "Italiano", keyword: "ATTESA", title: "Attesa attuale", zero: "Nessuna attesa ora. Venga pure.", wait: m => "Circa " + m + " minuti",
        upd: m => "Aggiornato " + m + " min fa", stale: "Questa stima potrebbe non essere aggiornata. Chiami per conferma.",
        closed: "La clinica ora è chiusa.", opens: s => "Apre " + s, today: "oggi", day: d => d,
        at: h => " alle " + h + ":00",
        nodata: "Il tempo di attesa non è disponibile ora. Per favore chiami.", sms: p => "Senza internet? Invii ATTESA al " + p + "." }
};

function isOpen(now) {
  const h = CONFIG.hours[now.getDay()];
  const t = now.getHours() + now.getMinutes() / 60;
  return !!h && t >= h[0] && t < h[1];
}

function nextOpen(now, lang) {
  const t = now.getHours() + now.getMinutes() / 60;
  for (let i = 0; i < 8; i++) {
    const day = (now.getDay() + i) % 7, h = CONFIG.hours[day];
    if (!h || (i === 0 && t >= h[0])) continue;
    const T = TEXT[lang];
    return (i === 0 ? T.today : T.day(DAYS[lang][day])) + T.at(h[0]);
  }
  return "";
}

function statusMessage(s, now, lang) {
  const T = TEXT[lang] || TEXT.en;
  lang = TEXT[lang] ? lang : "en";
  const closedMsg = { main: T.closed, sub: T.opens(nextOpen(now, lang)), warn: "" };
  if (!isOpen(now)) return closedMsg;
  // Only data set today counts: a Closed tap or a wait left over from yesterday must not carry into a new day.
  const updated = s && s.updatedAt ? new Date(s.updatedAt) : new Date(NaN);
  const today = updated >= new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (s && s.closed === true && today) return closedMsg;
  const valid = today && Number.isInteger(s.waitMinutes) && s.waitMinutes >= 0 && s.waitMinutes <= CONFIG.maxWait;
  if (!valid) return { main: T.nodata, sub: CONFIG.phone, warn: "" };
  const age = Math.max(0, Math.floor((now - new Date(s.updatedAt)) / 60000));
  return { main: s.waitMinutes === 0 ? T.zero : T.wait(s.waitMinutes),
           sub: T.upd(age), warn: age > CONFIG.staleMinutes ? T.stale : "" };
}

// Language of an incoming text: its first word matched against each language's keyword (English if none match).
function smsLang(body) {
  const word = String(body || "").trim().split(/\s+/)[0].toUpperCase();
  return LANGS.find(l => TEXT[l].keyword === word) || "en";
}

function smsText(s, now, lang) {
  const r = statusMessage(s, now, lang);
  return [r.main, r.sub, r.warn].filter(Boolean).map(x => /[.!?]$/.test(x) ? x : x + ".").join(" ");
}

// Twilio reply. A text (has a Body) gets one <Message> in the keyword's language;
// a call gets the same sentence spoken in each of CONFIG.voiceLangs, one after the other.
function twiml(s, now, body) {
  const clean = t => t.replace(/[<&>]/g, "");
  const xml = body === undefined
    ? CONFIG.voiceLangs.map(l => '<Say language="' + TEXT[l].voice + '">' + clean(TEXT[l].spoken(smsText(s, now, l))) + "</Say>").join('<Pause length="1"/>')
    : "<Message>" + clean(smsText(s, now, smsLang(body))) + "</Message>";
  return '<?xml version="1.0" encoding="UTF-8"?><Response>' + xml + "</Response>";
}

if (typeof module !== "undefined") module.exports = { CONFIG, LANGS, TEXT, smsLang, isOpen, nextOpen, statusMessage, smsText, twiml };
