# WhatsApp webhook work saved for later

Webhook support is intentionally **not active** in the current `google-apps-script/Code.gs`. This file preserves the webhook-only changes that were removed so the current site can be deployed without configuring Meta webhooks yet.

## Script Properties to add when resuming

- `WA_WEBHOOK_VERIFY_TOKEN`: a private random value used for Meta's GET verification challenge.
- `WA_WEBHOOK_REQUEST_KEY`: a different private random value required on webhook requests.

Do not add these until webhook setup resumes. Keep both values out of source files and chat.

## `doGet` addition

Add this at the start of `doGet(event)`, before the other query handling:

```js
if (event && event.parameter && event.parameter['hub.mode']) {
  return verifyWhatsAppWebhook(event);
}
```

## `doPost` addition

Add this at the start of the `try` block in `doPost(event)`, before parsing the website form's `payload` parameter:

```js
const rawBody = event && event.postData && event.postData.contents;
if (rawBody) {
  const incoming = JSON.parse(rawBody);
  if (incoming && incoming.object === 'whatsapp_business_account') {
    const accepted = receiveWhatsAppWebhook(event, incoming);
    return ContentService.createTextOutput(accepted ? 'EVENT_RECEIVED' : 'IGNORED')
      .setMimeType(ContentService.MimeType.TEXT);
  }
}
```

## Functions to add to `Code.gs`

```js
function verifyWhatsAppWebhook(event) {
  const properties = PropertiesService.getScriptProperties();
  const verifyToken = properties.getProperty('WA_WEBHOOK_VERIFY_TOKEN');
  const requestKey = properties.getProperty('WA_WEBHOOK_REQUEST_KEY');
  const params = event.parameter || {};
  const valid = params['hub.mode'] === 'subscribe'
    && verifyToken && params['hub.verify_token'] === verifyToken
    && requestKey && params.wa_hook_key === requestKey;
  if (!valid) return ContentService.createTextOutput('Webhook verification failed').setMimeType(ContentService.MimeType.TEXT);
  return ContentService.createTextOutput(params['hub.challenge'] || '').setMimeType(ContentService.MimeType.TEXT);
}

function receiveWhatsAppWebhook(event, payload) {
  const properties = PropertiesService.getScriptProperties();
  const expectedKey = properties.getProperty('WA_WEBHOOK_REQUEST_KEY');
  if (!expectedKey || !event || !event.parameter || event.parameter.wa_hook_key !== expectedKey) {
    console.warn('Ignored WhatsApp webhook request without the configured callback key.');
    return false;
  }

  const expectedPhoneNumberId = properties.getProperty('WA_PHONE_NUMBER_ID');
  const spreadsheet = SpreadsheetApp.openById(SHEETS.rsvps.id);
  const sheetName = 'WhatsApp Status';
  const sheet = spreadsheet.getSheetByName(sheetName) || spreadsheet.insertSheet(sheetName);
  const headers = ['Received At', 'Message ID', 'Recipient', 'Status', 'Status Timestamp', 'Error Code', 'Error Detail'];
  if (sheet.getLastRow() === 0) sheet.appendRow(headers);

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    (payload.entry || []).forEach(entry => (entry.changes || []).forEach(change => {
      if (change.field !== 'messages') return;
      const value = change.value || {};
      const metadata = value.metadata || {};
      if (!expectedPhoneNumberId || String(metadata.phone_number_id || '') !== String(expectedPhoneNumberId)) {
        console.warn('Ignored WhatsApp status event for an unexpected phone number ID.');
        return;
      }
      (value.statuses || []).forEach(status => {
        const errors = status.errors || [];
        const error = errors.length ? errors[0] : {};
        const row = [new Date(), status.id || '', status.recipient_id || '', status.status || '', status.timestamp || '', error.code || '', error.title || error.message || ''];
        sheet.appendRow(row.map(safeCell));
      });
    }));
  } finally {
    lock.releaseLock();
  }
  return true;
}
```

When resuming, also restore the webhook-specific setup section and the two property rows from the repository history/this backup, then deploy a new Apps Script version before configuring Meta. Meta's callback URL should include `?wa_hook_key=...`; the Verify token field must match `WA_WEBHOOK_VERIFY_TOKEN`. Subscribe to the `messages` field and enable **Subscribe webhooks** for the correct WhatsApp account. This receiver records future statuses in a `WhatsApp Status` tab; it cannot recover past statuses.
