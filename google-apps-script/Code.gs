const SHEETS = {
  rsvps: {
    id: '1wOSEpNrRdV0c2RVRKM47PnAjaVA_h8kvyqAroapEHCE',
    headers: ['Submitted At', 'Guest Name', 'Attendance', 'Email', 'Phone', 'Event Updates Consent', 'Message to the Couple']
  },
  notes: {
    id: '1H2JMa6ofAOakaVlTGCgX8v2IFcwgMoLgX_lh9xLvTZ8',
    headers: ['Submitted At', 'Name', 'Wish or Memory', 'Advice for Married Life']
  }
};

function doPost(event) {
  let payload = {};
  try {
    if (!event || !event.parameter || !event.parameter.payload) throw new Error('Missing form data.');
    payload = JSON.parse(event.parameter.payload);
    if (payload.website) return responsePage(payload.requestId, true);

    if (payload.type === 'rsvp') saveRsvp(payload);
    else if (payload.type === 'guest_note') saveGuestNote(payload);
    else throw new Error('Unknown form type.');

    return responsePage(payload.requestId, true);
  } catch (error) {
    console.error(error);
    return responsePage(payload.requestId, false, 'We could not save your response. Please try again.');
  }
}

function saveRsvp(payload) {
  const name = cleanText(payload.name, 120, 'Name', true);
  const attendance = String(payload.attendance || '');
  if (attendance !== 'Accepts' && attendance !== 'Declines') throw new Error('Choose whether you will attend.');

  const consent = String(payload.eventUpdatesConsent || '').toLowerCase();
  if (consent !== 'yes' && consent !== 'no') throw new Error('Choose whether to receive event-day updates.');
  const email = cleanText(payload.email, 254, 'Email', consent === 'yes');
  const phone = cleanText(payload.phone, 30, 'Phone', consent === 'yes');
  const message = cleanText(payload.message, 2000, 'Message', false);

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter a valid email address.');
  if (phone && !/^\+?[0-9][0-9\s().-]{5,28}$/.test(phone)) throw new Error('Enter a valid phone number.');

  appendRow(SHEETS.rsvps, [new Date(), name, attendance, email, phone, consent === 'yes' ? 'Yes' : 'No', message]);
}

function saveGuestNote(payload) {
  const name = cleanText(payload.name, 120, 'Name', true);
  const wishOrMemory = cleanText(payload.wishOrMemory, 2000, 'Wish or memory', false);
  const marriedLifeAdvice = cleanText(payload.marriedLifeAdvice, 2000, 'Advice for married life', false);
  if (!wishOrMemory && !marriedLifeAdvice) throw new Error('Share a wish, memory, or advice before sending.');
  appendRow(SHEETS.notes, [new Date(), name, wishOrMemory, marriedLifeAdvice]);
}

function cleanText(value, maxLength, fieldName, required) {
  const text = String(value == null ? '' : value).trim();
  if (required && !text) throw new Error(fieldName + ' is required.');
  if (text.length > maxLength) throw new Error(fieldName + ' is too long.');
  return text;
}

function safeCell(value) {
  if (value instanceof Date) return value;
  const text = String(value == null ? '' : value);
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function appendRow(destination, values) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const spreadsheet = SpreadsheetApp.openById(destination.id);
    const sheet = spreadsheet.getSheets()[0];
    if (sheet.getLastRow() === 0) sheet.appendRow(destination.headers);
    sheet.appendRow(values.map(safeCell));
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }
}

function responsePage(requestId, ok, message) {
  const safeRequestId = String(requestId || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80);
  const response = {
    source: 'wedding-sheets',
    requestId: safeRequestId,
    ok: Boolean(ok),
    message: message || ''
  };
  const html = '<!doctype html><html><head><meta charset="utf-8"></head><body><script>' +
    'window.parent.postMessage(' + JSON.stringify(response) + ', "*");' +
    '</script></body></html>';
  return HtmlService.createHtmlOutput(html).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
