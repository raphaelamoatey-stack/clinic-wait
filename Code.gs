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
    if (p.pin !== PIN) return HtmlService.createHtmlOutput("Not authorized.");
    return HtmlService.createHtmlOutputFromFile("Staff").addMetaTag("viewport", "width=device-width,initial-scale=1");
  }
  return ContentService.createTextOutput(JSON.stringify(readStatus())).setMimeType(ContentService.MimeType.JSON);
}

// Called from Staff.html via google.script.run
function setWait(n) {
  if (!Number.isInteger(n) || n < 0 || n > CONFIG.maxWait) throw new Error("Invalid wait");
  sheet().getRange("A2:C2").setValues([[n, new Date(), false]]);
  return readStatus();
}
function setClosed() {
  sheet().getRange("B2:C2").setValues([[new Date(), true]]);
  return readStatus();
}

// Twilio webhook for texts and calls. Reads only; never stores the caller's number.
function doPost(e) {
  const p = e.parameter || {};
  const msg = smsText(readStatus(), new Date(), smsLang(p.Body)).replace(/[<&>]/g, "");
  const tag = p.Body === undefined ? "Say" : "Message";
  const xml = '<?xml version="1.0" encoding="UTF-8"?><Response><' + tag + '>' + msg + '</' + tag + '></Response>';
  return ContentService.createTextOutput(xml).setMimeType(ContentService.MimeType.XML);
}
