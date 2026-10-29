const PIN = "change-me-monthly";
const sheet = () => SpreadsheetApp.getActive().getSheetByName("Status");

function readStatus() {
  const [wait, updated, closed] = sheet().getRange("A2:C2").getValues()[0];
  if (wait === "" || !updated) return {};
  return { waitMinutes: Number(wait), updatedAt: new Date(updated).toISOString(), closed: closed === true };
}

function doGet(e) {
  const p = e.parameter || {};
  if (p.staff === "1") {
    if (p.pin !== PIN) return HtmlService.createHtmlOutput(
      '<main style="font:1.25rem/1.4 system-ui,sans-serif;max-width:40rem;margin:0 auto;padding:1rem">' +
      "<h1>This staff link doesn’t work</h1><p>The PIN in the link is wrong or has changed. " +
      "The PIN changes every month: ask the clinic manager for the current link, then bookmark it again.</p></main>")
      .setTitle("Staff link not valid").addMetaTag("viewport", "width=device-width,initial-scale=1");
    return HtmlService.createHtmlOutputFromFile("Staff").setTitle("Front desk: wait time")
      .addMetaTag("viewport", "width=device-width,initial-scale=1");
  }
  return ContentService.createTextOutput(JSON.stringify(readStatus())).setMimeType(ContentService.MimeType.JSON);
}

// Called from Staff.html via google.script.run. Each returns what the staff page shows:
// the row, the exact sentence patients see (English), and whether the clinic is within opening hours.
function staffView() {
  const s = readStatus(), now = new Date();
  return { status: s, preview: statusMessage(s, now, "en"), open: isOpen(now) };
}
function setWait(n) {
  if (!Number.isInteger(n) || n < 0 || n > CONFIG.maxWait) throw new Error("Invalid wait");
  sheet().getRange("A2:C2").setValues([[n, new Date(), false]]);
  return staffView();
}
function setClosed() {
  sheet().getRange("B2:C2").setValues([[new Date(), true]]);
  return staffView();
}

// Twilio webhook for texts and calls. Reads only; never stores the caller's number.
function doPost(e) {
  const p = e.parameter || {};
  return ContentService.createTextOutput(twiml(readStatus(), new Date(), p.Body)).setMimeType(ContentService.MimeType.XML);
}
