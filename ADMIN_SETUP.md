# Private event admin setup

The site now has an `/admin/` page with server-side sign-in, a private RSVP view, and nine event-trigger buttons. Each button opens an editor for the email subject, message, and map link. Messages can include `{{name}}` to personalize the guest greeting.

The page itself is public static content, so hiding the URL is not its security. The password check, session token, sheet reads, and send actions run in Apps Script; no password, Google credential, or WhatsApp token is stored in the website files. The admin functions require a short-lived server session.

## Update the Apps Script deployment

1. Open the standalone Apps Script project that currently handles RSVP submissions.
2. Replace `Code.gs` with `google-apps-script/Code.gs` from this repository.
3. Add an Apps Script **HTML** file named `Admin` and paste in `google-apps-script/Admin.html`.
4. In **Project Settings → Script Properties**, add the values described below. Keep this project private to the people who administer the wedding.
5. Choose **Deploy → Manage deployments**, edit the existing web app deployment, create a new version, and deploy it. Keep the existing `/exec` deployment URL; the site’s `/admin/` wrapper already points to it.
6. Accept the new authorization requests for spreadsheet access, email sending, and external HTTP requests. Do not share the Apps Script project with guests.

The website host serves `admin/index.html` at `/admin/`. Most static hosts redirect `/admin` to `/admin/`; if yours does not, use `/admin/` or configure that redirect in the host settings.

## Script Properties

Set these in Apps Script project settings, never in `Admin.html`, `script.js`, or this repository:

| Property | Value |
|---|---|
| `ADMIN_USER_ID` | `8223922` (or another ID you choose) |
| `ADMIN_PASSWORD` | A new, unique password. The password previously posted in chat should be replaced before deployment. |
| `EMAIL_SENDER_NAME` | Optional display name, for example `Ansh of Our Story` |
| `EMAIL_REPLY_TO` | Optional reply address |
| `WA_ACCESS_TOKEN` | Long-lived access token for your Meta WhatsApp Business Platform app |
| `WA_PHONE_NUMBER_ID` | Phone Number ID from the WhatsApp Cloud API setup |
| `WA_API_VERSION` | Current Graph API version from Meta, in the form `vXX.0` |
| `WA_TEMPLATE_NAME` | Optional default approved template name; defaults to `wedding_event_update` |
| `WA_TEMPLATE_LANGUAGE` | Optional template language; defaults to `en` |

The website login form contains no fixed user ID or password. Script Properties are private to the Apps Script project, so restrict project editor access to trusted administrators. Do not send the WhatsApp token or any account password in chat or commit it to Git.

## Email sender identity

The trigger sends email through the Google account that authorized the Apps Script. `EMAIL_SENDER_NAME` controls the display name, but the sender address remains that Google account. No email password is needed in the site. To send with a real `@anshofourstory.com` address, first set up a mailbox or verified domain alias with your mail provider and authenticate the domain’s sending service. Google's guidance recommends SPF, DKIM, and DMARC for delivery and sender authentication: [Gmail sender guidelines](https://support.google.com/mail/answer/81126?hl=en).

Apps Script shows the remaining daily email-recipient quota in the admin page and blocks a send that exceeds the remaining quota. Quotas depend on the Google account type and can change; see [Apps Script quotas](https://developers.google.com/apps-script/guides/services/quotas).

## WhatsApp setup and consent

Use Meta's official WhatsApp Business Platform Cloud API or an authorized provider. Do not use a personal WhatsApp login, browser automation, or share a WhatsApp account password. The Apps Script needs the access token, Phone Number ID, and API version in Script Properties.

In WhatsApp Manager, create and get approval for a message template whose body contains **three text variables in this order**:

1. Guest name
2. The custom message from the admin editor
3. The map link (or the fallback location text when no link is entered)

For example, a template could read: `Hello {{1}}, an event-day update from Anchita & Suyash: {{2}} Location: {{3}}`. The admin editor supplies the second variable; the template's static text remains subject to Meta review. Business-initiated messages must use approved templates, and WhatsApp requires opt-in to receive messages. See the [WhatsApp Business Policy](https://whatsappbusiness.com/policy/).

The RSVP form now asks for WhatsApp permission separately from general event updates. Only rows with both `Event Updates Consent = Yes` and `WhatsApp Updates Consent = Yes` are eligible for WhatsApp triggers. Older rows have no separate WhatsApp permission and will be treated as **not opted in**. The RSVP script adds the new `WhatsApp Updates Consent` column to the existing header row on the next submission.

The nine trigger buttons do not send a message immediately. Each opens a review form, shows the eligible recipient counts, and asks for confirmation before sending. Email goes only to event-update opt-ins with an email address; WhatsApp goes only to explicit WhatsApp opt-ins with a phone number.
