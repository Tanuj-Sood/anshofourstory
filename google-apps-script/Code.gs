const SHEETS = {
  rsvps: {
    id: '1wOSEpNrRdV0c2RVRKM47PnAjaVA_h8kvyqAroapEHCE',
    headers: ['Submitted At', 'Guest Name', 'Attendance', 'Email', 'Phone', 'Event Updates Consent', 'Message to the Couple', 'WhatsApp Updates Consent', 'Signup WhatsApp Status']
  },
  notes: {
    id: '1H2JMa6ofAOakaVlTGCgX8v2IFcwgMoLgX_lh9xLvTZ8',
    headers: ['Submitted At', 'Name', 'Wish or Memory', 'Advice for Married Life']
  }
};

const EVENT_TRIGGERS = {
  haldi: 'Haldi trigger',
  haldi_about_to_start: 'Haldi about to start trigger',
  mehndi: 'Mehndi trigger',
  mehndi_about_to_start: 'Mehndi about to start trigger',
  engagement: 'Engagement trigger',
  engagement_about_to_start: 'Engagement about to start trigger',
  wedding: 'Wedding trigger',
  wedding_about_to_start: 'Wedding about to start trigger',
  phera_start: 'Phera start trigger'
};

function doGet(event) {
  if (event && event.parameter && event.parameter.page === 'admin') {
    return HtmlService.createHtmlOutputFromFile('Admin')
      .setTitle('Ansh of Our Story | Admin')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
  return HtmlService.createHtmlOutput('Ansh of Our Story guest services are ready.');
}

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
  const whatsappConsent = consent === 'yes' ? String(payload.whatsappUpdatesConsent || '').toLowerCase() : 'no';
  if (consent === 'yes' && whatsappConsent !== 'yes' && whatsappConsent !== 'no') throw new Error('Choose whether to receive WhatsApp updates.');

  const email = cleanText(payload.email, 254, 'Email', consent === 'yes');
  const phone = cleanText(payload.phone, 30, 'Phone', consent === 'yes');
  const message = cleanText(payload.message, 2000, 'Message', false);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter a valid email address.');
  if (phone && !/^\+?[0-9][0-9\s().-]{5,28}$/.test(phone)) throw new Error('Enter a valid phone number.');

  ensureSignupTrackingColumn();
  appendRow(SHEETS.rsvps, {
    'Submitted At': new Date(),
    'Guest Name': name,
    'Attendance': attendance,
    'Email': email,
    'Phone': phone,
    'Event Updates Consent': consent === 'yes' ? 'Yes' : 'No',
    'Message to the Couple': message,
    'WhatsApp Updates Consent': whatsappConsent === 'yes' ? 'Yes' : 'No',
    'Signup WhatsApp Status': whatsappConsent === 'yes' ? 'Pending' : 'Not opted in'
  });
}

function saveGuestNote(payload) {
  const name = cleanText(payload.name, 120, 'Name', true);
  const wishOrMemory = cleanText(payload.wishOrMemory, 2000, 'Wish or memory', false);
  const marriedLifeAdvice = cleanText(payload.marriedLifeAdvice, 2000, 'Advice for married life', false);
  if (!wishOrMemory && !marriedLifeAdvice) throw new Error('Share a wish, memory, or advice before sending.');
  appendRow(SHEETS.notes, {
    'Submitted At': new Date(),
    'Name': name,
    'Wish or Memory': wishOrMemory,
    'Advice for Married Life': marriedLifeAdvice
  });
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

function appendRow(destination, record) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const spreadsheet = SpreadsheetApp.openById(destination.id);
    const sheet = spreadsheet.getSheets()[0];
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(destination.headers);
    } else {
      const currentHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0];
      const missingHeaders = destination.headers.filter(header => currentHeaders.indexOf(header) === -1);
      if (missingHeaders.length) sheet.getRange(1, currentHeaders.length + 1, 1, missingHeaders.length).setValues([missingHeaders]);
    }
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0];
    sheet.appendRow(headers.map(header => safeCell(record[header])));
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }
}

function ensureSignupTrackingColumn() {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = SpreadsheetApp.openById(SHEETS.rsvps.id).getSheets()[0];
    const lastRow = sheet.getLastRow();
    if (lastRow === 0) {
      sheet.getRange(1, 1, 1, SHEETS.rsvps.headers.length).setValues([SHEETS.rsvps.headers]);
      return;
    }

    let lastColumn = sheet.getLastColumn();
    let headers = sheet.getRange(1, 1, 1, lastColumn).getDisplayValues()[0].map(value => String(value).trim());
    const missingHeaders = SHEETS.rsvps.headers.filter(header => headers.indexOf(header) === -1);
    if (missingHeaders.length) {
      sheet.getRange(1, lastColumn + 1, 1, missingHeaders.length).setValues([missingHeaders]);
      headers = headers.concat(missingHeaders);
      lastColumn += missingHeaders.length;
    }

    const statusColumn = headers.indexOf('Signup WhatsApp Status') + 1;
    if (lastRow > 1) {
      const statusRange = sheet.getRange(2, statusColumn, lastRow - 1, 1);
      const statuses = statusRange.getDisplayValues();
      let changed = false;
      statuses.forEach(row => {
        if (!String(row[0] || '').trim()) {
          row[0] = 'Existing';
          changed = true;
        }
      });
      if (changed) statusRange.setValues(statuses);
    }
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }
}

function adminLogin(userId, password) {
  const properties = PropertiesService.getScriptProperties();
  const expectedUser = properties.getProperty('ADMIN_USER_ID');
  const expectedPassword = properties.getProperty('ADMIN_PASSWORD');
  if (!expectedUser || !expectedPassword) throw new Error('Admin credentials are not configured in Apps Script properties.');
  if (String(userId || '') !== expectedUser || String(password || '') !== expectedPassword) throw new Error('The user ID or password is incorrect.');
  const token = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
  CacheService.getScriptCache().put('admin-session:' + token, 'valid', 21600);
  return { token: token, expiresIn: 21600 };
}

function adminLogout(token) {
  if (token) CacheService.getScriptCache().remove('admin-session:' + String(token));
  return { ok: true };
}

function adminGetDashboard(token) {
  requireAdmin(token);
  ensureSignupTrackingColumn();
  const recipients = readOptedInRecipients();
  const properties = PropertiesService.getScriptProperties();
  return {
    recipients: recipients,
    emailCount: recipients.filter(record => record.email).length,
    whatsappCount: recipients.filter(record => record.whatsappUpdatesConsent === 'yes' && record.phone).length,
    signupWhatsAppCount: recipients.filter(record => record.whatsappUpdatesConsent === 'yes' && record.phone && isSignupPending(record.signupWhatsAppStatus)).length,
    emailQuota: MailApp.getRemainingDailyQuota(),
    whatsappConfigured: Boolean(properties.getProperty('WA_ACCESS_TOKEN') && properties.getProperty('WA_PHONE_NUMBER_ID') && properties.getProperty('WA_API_VERSION')),
    whatsappTemplate: properties.getProperty('WA_TEMPLATE_NAME') || 'wedding_event_update',
    whatsappLanguage: properties.getProperty('WA_TEMPLATE_LANGUAGE') || 'en',
    signupTemplate: properties.getProperty('WA_SIGNUP_TEMPLATE_NAME') || 'event_updates_signup_thanks',
    signupLanguage: properties.getProperty('WA_SIGNUP_TEMPLATE_LANGUAGE') || 'en',
    emailSenderName: properties.getProperty('EMAIL_SENDER_NAME') || 'Anchita & Suyash'
  };
}

function adminSendTrigger(token, request) {
  requireAdmin(token);
  request = request || {};
  const triggerName = EVENT_TRIGGERS[String(request.triggerId || '')];
  if (!triggerName) throw new Error('Choose a valid event trigger.');
  const message = cleanText(request.message, 1800, 'Message', true);
  if (request.sendWhatsApp && message.length > 1024) throw new Error('WhatsApp message text must be 1,024 characters or fewer.');
  const mapUrl = cleanText(request.mapUrl, 500, 'Map link', false);
  if (mapUrl && !/^https:\/\//i.test(mapUrl)) throw new Error('Map links must begin with https://');
  if (!request.sendEmail && !request.sendWhatsApp) throw new Error('Choose email, WhatsApp, or both.');

  const recipients = readOptedInRecipients();
  const result = { trigger: triggerName, emailSent: 0, emailFailed: 0, whatsappSent: 0, whatsappFailed: 0, errors: [] };
  if (request.sendEmail) {
    const subject = cleanText(request.subject, 180, 'Email subject', true).replace(/[\r\n]+/g, ' ');
    const emailRecipients = recipients.filter(record => record.email);
    if (MailApp.getRemainingDailyQuota() < emailRecipients.length) throw new Error('The daily Google email recipient quota is too low for this send.');
    const properties = PropertiesService.getScriptProperties();
    const senderName = properties.getProperty('EMAIL_SENDER_NAME') || 'Anchita & Suyash';
    const replyTo = properties.getProperty('EMAIL_REPLY_TO') || '';
    emailRecipients.forEach(record => {
      const personalized = personalize(message, record.name);
      const body = personalized + (mapUrl ? '\n\nLocation: ' + mapUrl : '');
      try {
        const options = { to: record.email, subject: personalize(subject, record.name), body: body, name: senderName };
        if (replyTo) options.replyTo = replyTo;
        MailApp.sendEmail(options);
        result.emailSent += 1;
      } catch (error) {
        result.emailFailed += 1;
        if (result.errors.length < 3) result.errors.push('Email send failed for one recipient.');
      }
    });
  }

  if (request.sendWhatsApp) {
    const whatsappRecipients = recipients.filter(record => record.whatsappUpdatesConsent === 'yes' && record.phone);
    const templateName = cleanText(request.whatsappTemplate || PropertiesService.getScriptProperties().getProperty('WA_TEMPLATE_NAME'), 100, 'Approved WhatsApp template', true);
    const language = cleanText(request.whatsappLanguage || PropertiesService.getScriptProperties().getProperty('WA_TEMPLATE_LANGUAGE') || 'en', 20, 'WhatsApp language', true);
    whatsappRecipients.forEach(record => {
      try {
        sendWhatsAppTemplate(record, templateName, language, personalize(message, record.name), mapUrl);
        result.whatsappSent += 1;
      } catch (error) {
        result.whatsappFailed += 1;
        if (result.errors.length < 3) result.errors.push('A WhatsApp message could not be sent. Check the Cloud API credentials and approved template.');
      }
    });
  }
  return result;
}

function adminSendSignupTrigger(token, request) {
  requireAdmin(token);
  request = request || {};
  ensureSignupTrackingColumn();
  const properties = PropertiesService.getScriptProperties();
  const templateName = cleanText(request.templateName || properties.getProperty('WA_SIGNUP_TEMPLATE_NAME') || 'event_updates_signup_thanks', 100, 'Signup WhatsApp template', true);
  const language = cleanText(request.language || properties.getProperty('WA_SIGNUP_TEMPLATE_LANGUAGE') || 'en', 20, 'Signup WhatsApp template language', true);
  if (!properties.getProperty('WA_ACCESS_TOKEN') || !properties.getProperty('WA_PHONE_NUMBER_ID') || !properties.getProperty('WA_API_VERSION')) {
    throw new Error('WhatsApp Cloud API credentials are not configured.');
  }
  if (!/^[a-z0-9_]{1,100}$/.test(templateName)) throw new Error('WhatsApp template names use lowercase letters, numbers, and underscores.');

  const sheet = SpreadsheetApp.openById(SHEETS.rsvps.id).getSheets()[0];
  const lock = LockService.getScriptLock();
  const claimed = [];
  let trackingColumn = 0;
  lock.waitLock(10000);
  try {
    const values = sheet.getDataRange().getDisplayValues();
    if (values.length < 2) return { whatsappSent: 0, whatsappFailed: 0, pendingCount: 0, errors: [] };
    const headers = values[0].map(value => String(value).trim().toLowerCase());
    const column = name => headers.indexOf(name.toLowerCase());
    const statusColumn = column('Signup WhatsApp Status');
    if (statusColumn < 0) throw new Error('The signup tracking column is missing from the RSVP sheet.');
    trackingColumn = statusColumn + 1;
    const eventConsentColumn = column('Event Updates Consent');
    const whatsappConsentColumn = column('WhatsApp Updates Consent');
    const nameColumn = column('Guest Name');
    const phoneColumn = column('Phone');
    const claimTime = Date.now();
    values.slice(1).forEach((row, offset) => {
      const eligible = String(row[eventConsentColumn] || '').trim().toLowerCase() === 'yes'
        && String(row[whatsappConsentColumn] || '').trim().toLowerCase() === 'yes'
        && String(row[phoneColumn] || '').trim();
      if (!eligible || !isSignupPending(row[statusColumn])) return;
      const rowNumber = offset + 2;
      sheet.getRange(rowNumber, statusColumn + 1).setValue('Sending|' + claimTime);
      claimed.push({ rowNumber, name: String(row[nameColumn] || '').trim(), phone: String(row[phoneColumn] || '').trim() });
    });
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }

  const result = { whatsappSent: 0, whatsappFailed: 0, pendingCount: 0, errors: [] };
  claimed.forEach(record => {
    try {
      sendWhatsAppSignupTemplate(record, templateName, language);
      result.whatsappSent += 1;
      try {
        sheet.getRange(record.rowNumber, trackingColumn).setValue('Sent|' + new Date().toISOString());
      } catch (statusError) {
        if (result.errors.length < 3) result.errors.push('A message was sent, but its sent status could not be saved.');
      }
    } catch (error) {
      result.whatsappFailed += 1;
      try {
        sheet.getRange(record.rowNumber, trackingColumn).setValue('Pending');
      } catch (statusError) {
        if (result.errors.length < 3) result.errors.push('A failed message could not be returned to the pending list.');
      }
      if (result.errors.length < 3) result.errors.push('A signup WhatsApp message failed. Check the approved template and recipient number.');
    }
  });
  result.pendingCount = readOptedInRecipients().filter(record => record.whatsappUpdatesConsent === 'yes' && record.phone && isSignupPending(record.signupWhatsAppStatus)).length;
  return result;
}

function isSignupPending(status) {
  const value = String(status || '').trim();
  if (value.toLowerCase() === 'pending') return true;
  const match = value.match(/^Sending\|(\d+)$/i);
  return Boolean(match && Date.now() - Number(match[1]) > 20 * 60 * 1000);
}

function requireAdmin(token) {
  if (!token || CacheService.getScriptCache().get('admin-session:' + String(token)) !== 'valid') throw new Error('Your admin session expired. Please sign in again.');
}

function readOptedInRecipients() {
  const sheet = SpreadsheetApp.openById(SHEETS.rsvps.id).getSheets()[0];
  const values = sheet.getDataRange().getDisplayValues();
  if (values.length < 2) return [];
  const headers = values.shift().map(value => String(value).trim().toLowerCase());
  const column = name => headers.indexOf(name.toLowerCase());
  const get = (row, name) => {
    const index = column(name);
    return index < 0 ? '' : String(row[index] || '').trim();
  };
  return values.map(row => ({
    submittedAt: get(row, 'Submitted At'),
    name: get(row, 'Guest Name'),
    attendance: get(row, 'Attendance'),
    email: get(row, 'Email'),
    phone: get(row, 'Phone'),
    eventUpdatesConsent: get(row, 'Event Updates Consent').toLowerCase(),
    whatsappUpdatesConsent: get(row, 'WhatsApp Updates Consent').toLowerCase(),
    signupWhatsAppStatus: get(row, 'Signup WhatsApp Status')
  })).filter(record => record.eventUpdatesConsent === 'yes');
}

function personalize(text, name) {
  return String(text || '').replace(/\{\{name\}\}/gi, name || 'there');
}

function sendWhatsAppTemplate(record, templateName, language, message, mapUrl) {
  sendWhatsAppTemplateWithParameters(record, templateName, language, [
    { type: 'text', text: record.name || 'there' },
    { type: 'text', text: message },
    { type: 'text', text: mapUrl || 'Location details will be shared shortly.' }
  ]);
}

function sendWhatsAppSignupTemplate(record, templateName, language) {
  sendWhatsAppTemplateWithParameters(record, templateName, language, [
    { type: 'text', text: record.name || 'there' }
  ]);
}

function sendWhatsAppTemplateWithParameters(record, templateName, language, parameters) {
  const properties = PropertiesService.getScriptProperties();
  const accessToken = properties.getProperty('WA_ACCESS_TOKEN');
  const phoneNumberId = properties.getProperty('WA_PHONE_NUMBER_ID');
  const apiVersion = properties.getProperty('WA_API_VERSION');
  if (!accessToken || !phoneNumberId || !apiVersion) throw new Error('WhatsApp Cloud API credentials are not configured.');
  if (!/^v\d+\.\d+$/.test(apiVersion)) throw new Error('WhatsApp API version must look like vXX.0.');
  if (!/^[a-z0-9_]{1,100}$/.test(templateName)) throw new Error('WhatsApp template names use lowercase letters, numbers, and underscores.');
  const recipient = String(record.phone || '').replace(/\D/g, '');
  if (recipient.length < 7 || recipient.length > 15) throw new Error('Recipient phone number is invalid.');

  const payload = {
    messaging_product: 'whatsapp',
    to: recipient,
    type: 'template',
    template: {
      name: templateName,
      language: { code: language },
      components: [{
        type: 'body',
        parameters: parameters
      }]
    }
  };
  const response = UrlFetchApp.fetch('https://graph.facebook.com/' + apiVersion + '/' + phoneNumberId + '/messages', {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + accessToken },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
  const status = response.getResponseCode();
  if (status < 200 || status >= 300) throw new Error('WhatsApp API error: ' + response.getContentText().slice(0, 300));
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
