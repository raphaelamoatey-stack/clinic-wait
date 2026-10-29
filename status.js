const CONFIG = {
  phone: "+41 76 320 02 83",         // clinic phone, shown when data is missing
  staleMinutes: 30,
  maxWait: 480,
  hours: { 1: [8, 18], 2: [8, 18], 3: [8, 18], 4: [8, 18], 5: [8, 17], 6: [9, 13] } // 0 = Sunday, closed
};
const DAYS = {
  en: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  es: ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"]
};
const TEXT = {
  en: { title: "Current wait", zero: "No wait right now. Walk in.", wait: m => "About " + m + " minutes",
        upd: m => "Updated " + m + " min ago", stale: "This estimate may be out of date. Call to confirm.",
        closed: "The clinic is closed now.", opens: s => "Opens " + s, today: "today",
        nodata: "Wait time is not available right now. Please call.", sms: p => "No internet? Text WAIT to " + p + ".",
        other: "Español" },
  es: { title: "Espera actual", zero: "No hay espera ahora. Puede venir.", wait: m => "Unos " + m + " minutos",
        upd: m => "Actualizado hace " + m + " min", stale: "Este dato puede estar desactualizado. Llame para confirmar.",
        closed: "La clínica está cerrada ahora.", opens: s => "Abre " + s, today: "hoy",
        nodata: "El tiempo de espera no está disponible ahora. Por favor llame.", sms: p => "¿Sin internet? Envíe ESPERA al " + p + ".",
        other: "English" }
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
    const label = i === 0 ? TEXT[lang].today : (lang === "es" ? "el " : "") + DAYS[lang][day];
    return lang === "es" ? label + " a las " + h[0] + ":00"
                         : label + " at " + (h[0] % 12 || 12) + (h[0] < 12 ? " AM" : " PM");
  }
  return "";
}

function statusMessage(s, now, lang) {
  const T = TEXT[lang] || TEXT.en;
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

function smsText(s, now, lang) {
  const r = statusMessage(s, now, lang);
  return [r.main, r.sub, r.warn].filter(Boolean).map(x => /[.!?]$/.test(x) ? x : x + ".").join(" ");
}

if (typeof module !== "undefined") module.exports = { CONFIG, TEXT, isOpen, nextOpen, statusMessage, smsText };
