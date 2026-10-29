const test = require("node:test");
const assert = require("node:assert");
const { LANGS, TEXT, statusMessage, smsText, smsLang } = require("./status.js");

const at = (d, h, m = 0) => new Date(2026, 10, d, h, m);   // Nov 2026, local clinic time
const TUE10 = at(3, 10);                                    // Tue 3 Nov 2026, 10:00
const ago = min => new Date(TUE10 - min * 60000).toISOString();

test("T2 normal", () => {
  assert.deepStrictEqual(statusMessage({ waitMinutes: 45, updatedAt: ago(5) }, TUE10, "en"),
    { main: "About 45 minutes", sub: "Updated 5 min ago", warn: "" });
});
test("T3 stale boundary", () => {
  assert.match(statusMessage({ waitMinutes: 45, updatedAt: ago(31) }, TUE10, "en").warn, /out of date/);
  assert.strictEqual(statusMessage({ waitMinutes: 45, updatedAt: ago(30) }, TUE10, "en").warn, "");
});
test("T4 zero wait", () => {
  const r = statusMessage({ waitMinutes: 0, updatedAt: ago(1) }, TUE10, "en");
  assert.strictEqual(r.main, "No wait right now. Walk in.");
  assert.doesNotMatch(JSON.stringify(r), /About 0/);
});
test("T5 closed", () => {
  const s = { waitMinutes: 20, updatedAt: ago(1) };
  assert.deepStrictEqual(statusMessage(s, at(3, 19), "en").sub, "Opens Wednesday at 8 AM");
  assert.deepStrictEqual(statusMessage(s, at(1, 12), "en").sub, "Opens Monday at 8 AM");
  assert.deepStrictEqual(statusMessage(s, at(3, 7), "en").sub, "Opens today at 8 AM");
  assert.strictEqual(statusMessage({ ...s, closed: true }, TUE10, "en").main, "The clinic is closed now.");
});
test("T6 no data / invalid", () => {
  for (const s of [null, {}, { waitMinutes: -5, updatedAt: ago(1) }, { waitMinutes: 900, updatedAt: ago(1) },
                   { waitMinutes: 20 }, { waitMinutes: 20, updatedAt: "garbage" }]) {
    const r = statusMessage(s, TUE10, "en");
    assert.match(r.main, /not available/);
    assert.doesNotMatch(r.main + r.sub, /minutes/);
  }
});
test("T7 clock skew", () => {
  const future = new Date(TUE10.getTime() + 120000).toISOString();
  assert.strictEqual(statusMessage({ waitMinutes: 10, updatedAt: future }, TUE10, "en").sub, "Updated 0 min ago");
});
test("T8 SMS fits one text, every state, every language", () => {
  const states = [null, { waitMinutes: 0, updatedAt: ago(1) }, { waitMinutes: 120, updatedAt: ago(45) }, { closed: true }];
  for (const lang of LANGS) for (const s of states) for (const now of [TUE10, at(3, 19)])
    assert.ok(smsText(s, now, lang).length <= 160, lang + ": " + smsText(s, now, lang));
  assert.match(smsText({ waitMinutes: 45, updatedAt: ago(5) }, TUE10, "de"), /^Etwa 45 Minuten/);
  assert.match(smsText({ waitMinutes: 45, updatedAt: ago(5) }, TUE10, "fr"), /^Environ 45 minutes/);
  assert.match(smsText({ waitMinutes: 45, updatedAt: ago(5) }, TUE10, "it"), /^Circa 45 minuti/);
});
test("T5b Closed tapped yesterday does not close today", () => {
  const s = { waitMinutes: 30, updatedAt: at(2, 17, 55).toISOString(), closed: true };   // Mon 17:55
  assert.match(statusMessage(s, TUE10, "en").main, /not available/);
  assert.strictEqual(statusMessage(s, at(3, 19), "de").sub, "Öffnet am Mittwoch um 8:00");
  assert.strictEqual(statusMessage(s, at(3, 19), "fr").sub, "Ouvre mercredi à 8 h");
  assert.strictEqual(statusMessage(s, at(3, 19), "it").sub, "Apre mercoledì alle 8:00");
  assert.strictEqual(statusMessage(s, at(7, 7), "de").sub, "Öffnet heute um 9:00");
});
test("T6b yesterday's wait is not shown as today's", () => {
  const r = statusMessage({ waitMinutes: 30, updatedAt: at(2, 17, 30).toISOString() }, at(3, 8, 5), "en");
  assert.match(r.main, /not available/);
});
test("T8b SMS sentences are punctuated", () => {
  assert.strictEqual(smsText({ waitMinutes: 45, updatedAt: ago(5) }, TUE10, "en"), "About 45 minutes. Updated 5 min ago.");
});
test("T8c text keyword picks the language", () => {
  for (const [body, lang] of [["WAIT", "en"], ["warten", "de"], [" Attente ", "fr"], ["ATTESA please", "it"],
                              ["hello", "en"], ["", "en"], [undefined, "en"]])
    assert.strictEqual(smsLang(body), lang, String(body));
});
test("every language has every string", () => {
  for (const lang of LANGS) assert.deepStrictEqual(Object.keys(TEXT[lang]).sort(), Object.keys(TEXT.en).sort(), lang);
});
