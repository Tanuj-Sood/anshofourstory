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
5. Set **Execute as** to your account and **Who has access** to **Anyone**. Guests must be able to submit without signing in. The web app is public so it can accept guest submissions; admin sheet reads and sending actions require the server-side admin login and session.
6. Deploy, review the requested Google authorization, and copy the web app URL ending in `/exec`.
7. `script.js` already contains the current `/exec` URL. If Google gives you a different URL, update `SHEETS_WEB_APP_URL` there and publish the website update.

The website uses a hidden form target and the Apps Script response to confirm submissions. The admin view is served by the same web app in a full-page iframe. Neither spreadsheet is public, and no Google credentials are placed in the website code. Keep the spreadsheet IDs and Apps Script project under an account the couple will retain access to. Do not put a Google password, OAuth token, or service-account key in this repository.

The guest submission endpoint includes field validation and a hidden honeypot field. Since it must accept anonymous submissions, it can still be called by a bot that deliberately imitates the site. If spam becomes a problem, add a CAPTCHA or place the endpoint behind a server-side rate-limited proxy.

The private event admin page and trigger setup are described in [ADMIN_SETUP.md](ADMIN_SETUP.md). Sheet reads and event triggers are authenticated on the Apps Script server; the public spreadsheets remain private.
