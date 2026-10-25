# Google Sheets RSVP setup

The site now has two forms:

- **RSVPs** save guest name, attendance, email, phone, event-update consent, and the optional message to the couple in the Wedding RSVPs spreadsheet. Email and phone become required only when the guest opts in to updates. Guest count is not collected.
- **Guest Notes** save the guest name, wish or memory, and married-life advice in the Guest Notes spreadsheet. A guest must provide at least one of the two notes.

The Apps Script endpoint is in `google-apps-script/Code.gs`. It appends rows to the spreadsheet IDs supplied for this site. The first tab in each spreadsheet is used; if it is empty, the script adds the header row automatically.

## Deploy the endpoint

1. Sign in to the Google account that owns or can edit both spreadsheets.
2. Open [Google Apps Script](https://script.google.com/) and create a standalone project.
3. Replace the starter code with the contents of `google-apps-script/Code.gs`, then save.
4. Choose **Deploy → New deployment → Web app**.
5. Set **Execute as** to your account and **Who has access** to **Anyone**. Guests must be able to submit without signing in. This makes the write endpoint public; it only accepts form submissions and does not read or return sheet data.
6. Deploy, review the requested Google authorization, and copy the web app URL ending in `/exec`.
7. In `script.js`, replace `PASTE_YOUR_APPS_SCRIPT_WEB_APP_URL_HERE` in `SHEETS_WEB_APP_URL` with that URL and publish the website update.

The website uses a hidden form target and a short-lived message from the Apps Script response page to confirm whether the row was saved. This avoids needing to make either spreadsheet public or expose Google credentials in the website code. Keep the spreadsheet IDs and Apps Script project under an account the couple will retain access to. Do not put a Google password, OAuth token, or service-account key in this repository.

The endpoint includes field validation and a hidden honeypot field. Since it must accept anonymous submissions, it can still be called by a bot that deliberately imitates the site. If spam becomes a problem, add a CAPTCHA or place the endpoint behind a server-side rate-limited proxy.

For a future admin panel, keep reads behind a separately authenticated endpoint. Do not add sheet-reading behavior to this public write endpoint or change the spreadsheets to public access.
