# Clinic wait time — setup guide

About 30 minutes. You need: a Google account, a GitHub account, a Twilio account, and the clinic phone number.

## 1. The spreadsheet (5 min)
1. Create a new Google Sheet. Rename the tab at the bottom to **Status** (exact spelling).
2. Type in row 1: `waitMinutes` (A1), `updatedAt` (B1), `closed` (C1). Leave row 2 empty.
3. **File → Settings → Time zone:** pick the clinic's time zone.

## 2. The backend (10 min)
1. In the Sheet: **Extensions → Apps Script**.
2. Replace everything in `Code.gs` with the contents of `Code.gs`. Change `change-me-monthly` to a new PIN.
3. **+ → Script**, name it `Status`, paste in all of `status.js`.
4. **+ → HTML**, name it `Staff`, paste in all of `Staff.html`.
5. **Project Settings (gear) → Time zone:** the clinic's time zone. *Opening hours are wrong without this.*
6. **Deploy → New deployment → Web app.** Execute as: **Me**. Who has access: **Anyone**. Click **Deploy** and allow access.
7. Copy the **Web app URL** (ends in `/exec`).

## 3. The patient page (5 min)
1. In `index.html`, replace `https://script.google.com/macros/s/DEPLOYMENT_ID/exec` with your Web app URL.
2. In `status.js` (and the Apps Script `Status` file), set `phone` and `hours` for your clinic.
3. Create a public GitHub repo. Upload `index.html` and `status.js`.
4. Repo **Settings → Pages → Deploy from branch → main / root**. The page is at `https://<user>.github.io/<repo>/`.

## 4. Text and phone line (10 min)
1. In Twilio, buy one local number with SMS and Voice.
2. On the number's settings, set **A message comes in** and **A call comes in** to *Webhook*, *HTTP POST*, your Web app URL.

## 5. The front-desk tablet
Open `<Web app URL>?staff=1&pin=<your PIN>` and bookmark it to the home screen.

## Day to day
- **Change the wait:** tap a button on the tablet. At closing, tap **Closed**. (A Closed tap ends at midnight; until staff tap a wait the next day, patients see "not available, please call".)
- **Fix a number by hand:** edit row 2 of the Sheet.
- **Change the PIN (monthly):** edit `PIN` in `Code.gs` → **Deploy → Manage deployments → Edit → New version → Deploy**. Update the tablet bookmark.
- **Change hours or phone:** edit `status.js` on GitHub *and* the `Status` file in Apps Script (then deploy a new version as above). The two must match.

## Check it works
```
./live-check.sh '<Web app URL>' '<PIN>'
```
