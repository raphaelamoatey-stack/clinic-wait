# Clinic wait time: design spec (v2)

This spec sits on top of the product requirement and technical spec (Steps 1–2). Those still hold: one answer, fast, honest, no sign-in, nothing stored about patients. This document decides how the two screens look, read and behave.

## 1. Who uses it, and where

| Person | Where and how | What they need from the screen |
|---|---|---|
| **Patient or caregiver** | Parking lot or at home, on a phone, often stressed, sometimes with poor eyesight, slow mobile data, or a phone set to another language. | One answer at a glance: *should I go in now?* If the answer is uncertain, a one-tap way to call. |
| **Front-desk staff** | Shared tablet at the desk, between patients, interrupted constantly. Glances at the screen for a second or two. | *What do patients see right now?* and a one-tap way to change it, with proof that the change worked. |
| **Clinic manager** (volunteer) | The Google Sheet, once a month. | To see and fix the one row by hand (covered by SETUP.md, not by these screens). |

## 2. User flows

### Patient

**P1. Check the wait (main flow)**
1. Taps the link (QR code at the door, website, or text message).
2. Sees "Checking the wait time…" for at most a second or two, never a blank or a misleading message.
3. Sees the answer: the wait, how fresh it is, and how long the clinic stays open.
4. Decides: walk in now, or tap **Call the clinic**.

| State | Answer (largest text) | Supporting line | Warning (only when needed) | Main action |
|---|---|---|---|---|
| Open, wait set | About 45 minutes | Updated 5 min ago · Open until 18:00 | (none) | Call the clinic |
| Open, no wait | No wait right now. Walk in. | Updated just now · Open until 18:00 | (none) | Call the clinic |
| Open, older than 30 min | About 45 minutes | Updated 40 min ago · Open until 18:00 | This estimate may be out of date. Call to confirm. | Call the clinic |
| Open, wait runs past closing | About 90 minutes | Updated 5 min ago · Open until 18:00 | The clinic closes at 18:00. You may not be seen today. Call first. | Call the clinic |
| Closed (hours or staff tapped Closed) | The clinic is closed now. | Opens tomorrow at 8:00 | (none) | Call the clinic |
| No data, or the first request fails | Wait time is not available right now. Please call. | Open until 18:00 | (none) | Call the clinic |

**P2. Read it in my language.** The page opens in the phone's language if it is English, German, French or Italian. Otherwise one tap on the language list at the bottom changes every word on the page.

**P3. No internet.** The page always shows "No internet? Text WAIT to …". Texts and calls get the same sentence the page shows.

**P4. The connection drops while the page is open.** The page keeps the last answer it had, and the "Updated … min ago" age keeps counting. After 30 minutes the out-of-date warning appears on its own, so the page stays honest and is never wiped by one failed request.

### Front-desk staff

**S1. Update the wait (main flow)**
1. Opens the bookmarked staff link.
2. Sees **Patients see now**: the exact sentence patients see, and when it was set ("Set at 10:48 (12 min ago)").
3. Taps the current wait. The tapped button says "Saving…" and the other buttons are disabled until the server answers, so a double tap sends only one save.
4. Sees "Saved at 11:00. Patients now see: About 30 minutes." The tapped button is now marked as the current value.

**S2. Confirm the wait hasn't changed.** After 30 minutes the card says "Patients now see an 'out of date' warning. Tap the current wait, even if it hasn't changed." Tapping the value that is already marked saves it again with a new time.

**S3. Close for the day / reopen.** **Close for the day** is set apart from the wait buttons and styled differently, so it isn't hit by mistake. After it is tapped, the card says "Closed. To reopen, tap a wait time." A Closed tap ends at midnight on its own.

**S4. A save fails.** The message says what happened, what patients still see, and what to do: "Not saved. The tablet may be offline. Patients still see: About 45 minutes. Check the Wi-Fi and tap again." The marked button does not move.

**S5. Outside opening hours.** The card explains that patients see "closed" whatever is tapped, so staff aren't confused when a tap appears to do nothing.

**S6. Wrong or old staff link.** The page says the link doesn't work, why (the PIN changes monthly), and who to ask: the clinic manager.

## 3. Information hierarchy

### Patient page, top to bottom

1. Clinic name and "Wait time now": small, so people know they're on the right page.
2. **The answer**: the largest text on the page (at least twice the body size).
3. The warning, directly under the answer it qualifies, so the two are read together.
4. Freshness and today's closing time, on one line.
5. **Call the clinic**: a full-width button showing the number. It appears in every state, because every state has a reason to call.
6. "No internet? Text WAIT to …"
7. Language choice, at the bottom. Most people get the right language automatically, and the language buttons shouldn't push the answer down.

Everything fits on one 360 × 640 screen without scrolling, in all four languages and all states.

### Staff page, top to bottom

1. **Patients see now** card: the patient sentence in large type, when it was set, and any nudge (out of date, closed, outside hours).
2. "Tap the current wait" and the seven wait buttons, in a grid, current value marked.
3. **Close for the day**, set apart.
4. Result of the last tap (saved, or not saved and why).

## 4. Interaction patterns

| Pattern | Rule |
|---|---|
| **One tap, one result** | Every staff tap ends in a visible result: saved (with the time), or not saved (with the reason and the next step). |
| **Show the current state** | The wait button that matches what patients see is marked (filled, and `aria-pressed="true"`). Closed is marked the same way. |
| **Pending state** | While a save is in progress, the tapped button says "Saving…" and every button is disabled. |
| **Plain words** | Use the words staff and patients already use: "wait", "minutes", "closed", "open until". Never "status", "data", "API", "error 500". Times use the 24-hour clock, as on the clinic's door. |
| **No surprise announcements** | Screen readers hear the answer when the page loads and when the answer changes, never on an unchanged refresh. The minute-by-minute age is not announced. |
| **Errors keep the last good answer** | A failed request never replaces something true with something empty. |
| **Undo by doing** | No "are you sure?" dialogs. Every staff action is undone by tapping the right value. |

## 5. Accessibility requirements (WCAG 2.1 AA)

- Text contrast at least 4.5:1, and 3:1 for button borders, the focus ring and the warning edge.
- A visible focus ring of at least 3 px on everything that can be focused, with contrast of at least 3:1 against what's around it.
- Tab order follows the visual order. Everything works with a keyboard, including switch and screen-reader navigation on phones.
- One `<main>` and one `<h1>` on each page. The language list is a `<nav>` with a label in the current language. Each language button carries its own `lang` attribute.
- Live regions only for the answer and the warning (patient page) and the save result (staff page). They are updated only when their text changes.
- Touch targets at least 48 × 48 px on the patient page and 80 px tall on the staff tablet.
- No horizontal scrolling at 200% zoom on a 360 px screen.
- Nothing depends on colour alone: the current staff button is filled *and* announced as pressed; warnings have text, not just a colour.

## 6. Copy

| Situation | English | Why |
|---|---|---|
| Loading | Checking the wait time… | "…" alone is read aloud as "dot dot dot" and looks broken. |
| Age 0 | Updated just now | "Updated 0 min ago" reads like a fault. |
| Next opening is the next day | Opens tomorrow at 8:00 | Nobody at 19:00 on Tuesday thinks of Wednesday as "Wednesday". |
| Staff save failed | Not saved. The tablet may be offline. Patients still see: About 45 minutes. Check the Wi-Fi and tap again. | Says what happened, what patients see, and what to do. |
| Wrong staff link | This staff link doesn't work. The PIN in it is wrong or has changed. The PIN changes every month: ask the clinic manager for the current link. | Names the cause and the person who can fix it. |

German, French and Italian versions are in `status.js` and `Staff.html` and need a native speaker's check before launch.

## 7. Changes to the acceptance tests

- **T5:** "Opens Wednesday at 8 AM" becomes "Opens tomorrow at 8:00". A day name is used from two days out ("Opens Monday at 8:00" on a Saturday afternoon).
- **T7:** "Updated 0 min ago" becomes "Updated just now". The rule (never a negative age) is unchanged.
- **New T13:** a wait that runs past closing time shows the closing warning.
- **New T14:** an unchanged refresh causes no screen-reader announcement.
- **New T15:** a staff double tap sends one save; a failed save says what patients still see.
