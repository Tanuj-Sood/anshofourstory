(() => {
  const SHEETS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbyoeRyjp3fwyiSUPhMU4YcDRXo6SamagXn7HryZCHW05ZkfQKTCyHmnVATpQEIkNSgJ6Q/exec';
  const invitation = document.getElementById('invitation-preloader');
  const invitationButton = document.getElementById('invitation-open');
  document.body.classList.add('invitation-locked');
  invitationButton.addEventListener('click', () => {
    if (invitation.classList.contains('is-opening')) return;
    invitation.classList.add('is-opening');
    invitationButton.disabled = true;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.setTimeout(() => {
      invitation.classList.add('is-departing');
      window.setTimeout(() => {
        invitation.classList.add('is-gone');
        document.body.classList.remove('invitation-locked');
        invitation.setAttribute('aria-hidden', 'true');
        window.setTimeout(() => invitation.remove(), 550);
      }, reducedMotion ? 80 : 900);
    }, reducedMotion ? 80 : 2800);
  });

  const target = new Date('2027-02-12T11:00:00+05:30').getTime();
  const fields = ['days', 'hours', 'minutes', 'seconds'].map(id => document.getElementById(id));
  const updateCountdown = () => {
    const remaining = Math.max(0, target - Date.now());
    const values = [Math.floor(remaining / 86400000), Math.floor(remaining / 3600000) % 24, Math.floor(remaining / 60000) % 60, Math.floor(remaining / 1000) % 60];
    fields.forEach((field, index) => { field.textContent = String(values[index]).padStart(2, '0'); });
  };
  updateCountdown();
  window.setInterval(updateCountdown, 1000);

  const countdown = document.querySelector('.countdown');
  if (countdown) {
    const scratchHint = document.createElement('span');
    scratchHint.className = 'countdown-scratch-hint';
    scratchHint.textContent = 'Scratch across the cards to reveal your countdown';
    const countdownDigits = [...countdown.querySelectorAll('.time-card > span')];
    countdownDigits.forEach(digit => digit.setAttribute('aria-hidden', 'true'));
    countdown.append(scratchHint);

    const scratchLayers = [...countdown.querySelectorAll('.time-card')].map(card => {
      const canvas = document.createElement('canvas');
      canvas.className = 'countdown-scratch';
      canvas.setAttribute('role', 'button');
      canvas.setAttribute('aria-label', 'Scratch this card to reveal the wedding countdown. Press Space or Enter to reveal.');
      canvas.tabIndex = 0;
      card.append(canvas);
      return { card, canvas, context: canvas.getContext('2d'), segments: [], previousPoint: null };
    });
    let pixelRatio = 1;
    let segmentCount = 0;
    let isRevealed = false;

    const roundedRect = (context, x, y, width, height, radius) => {
      context.beginPath();
      context.roundRect(x, y, width, height, radius);
    };

    const drawScratchCoating = layer => {
      const bounds = layer.card.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      layer.canvas.width = Math.round(bounds.width * pixelRatio);
      layer.canvas.height = Math.round(bounds.height * pixelRatio);
      layer.canvas.style.width = `${bounds.width}px`;
      layer.canvas.style.height = `${bounds.height}px`;
      const context = layer.context;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      const radius = Math.min(13, bounds.width * .14);
      const gradient = context.createLinearGradient(0, 0, bounds.width, bounds.height);
      gradient.addColorStop(0, '#f8eef0');
      gradient.addColorStop(.48, '#e9cbd1');
      gradient.addColorStop(1, '#d9b1ba');
      roundedRect(context, 0, 0, bounds.width, bounds.height, radius);
      context.fillStyle = gradient;
      context.fill();
      context.save();
      roundedRect(context, 0, 0, bounds.width, bounds.height, radius);
      context.clip();
      context.strokeStyle = 'rgba(255,255,255,.27)';
      context.lineWidth = 1;
      for (let x = -bounds.height; x < bounds.width + bounds.height; x += 9) {
        context.beginPath();
        context.moveTo(x, 0);
        context.lineTo(x + bounds.height, bounds.height);
        context.stroke();
      }
      context.restore();
      roundedRect(context, .5, .5, bounds.width - 1, bounds.height - 1, radius);
      context.strokeStyle = 'rgba(199,178,125,.88)';
      context.lineWidth = 1;
      context.stroke();
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillStyle = '#9a6d78';
      context.font = '400 13px Georgia, serif';
      context.fillText('*', bounds.width / 2, bounds.height / 2 - 20);
      context.fillStyle = '#815d66';
      context.font = `500 ${bounds.width < 75 ? 7 : 8}px Arial, sans-serif`;
      context.fillText('SCRATCH', bounds.width / 2, bounds.height / 2 - 3);
      context.fillStyle = '#9a6d78';
      context.font = `400 ${bounds.width < 75 ? 6 : 7}px Arial, sans-serif`;
      context.fillText('TO REVEAL', bounds.width / 2, bounds.height / 2 + 10);

      if (layer.segments.length) {
        context.globalCompositeOperation = 'destination-out';
        context.lineCap = 'round';
        context.lineJoin = 'round';
        context.lineWidth = 34;
        layer.segments.forEach(segment => {
          context.beginPath();
          context.moveTo(segment[0], segment[1]);
          context.lineTo(segment[2], segment[3]);
          context.stroke();
        });
        context.globalCompositeOperation = 'source-over';
      }
    };

    const getScratchCoverage = () => {
      let sampled = 0;
      let cleared = 0;
      scratchLayers.forEach(layer => {
        const width = layer.canvas.width / pixelRatio;
        const height = layer.canvas.height / pixelRatio;
        const image = layer.context.getImageData(0, 0, layer.canvas.width, layer.canvas.height).data;
        for (let y = 6; y < height - 6; y += 12) {
          for (let x = 6; x < width - 6; x += 12) {
            const index = (Math.floor(y * pixelRatio) * layer.canvas.width + Math.floor(x * pixelRatio)) * 4 + 3;
            sampled += 1;
            if (image[index] < 80) cleared += 1;
          }
        }
      });
      return sampled ? cleared / sampled : 0;
    };

    const revealCountdown = () => {
      if (isRevealed) return;
      isRevealed = true;
      scratchLayers.forEach(({ canvas }) => {
        canvas.classList.add('is-revealed');
        canvas.setAttribute('aria-hidden', 'true');
        canvas.tabIndex = -1;
      });
      scratchHint.classList.add('is-hidden');
      countdownDigits.forEach(digit => digit.removeAttribute('aria-hidden'));
      window.setTimeout(() => {
        scratchLayers.forEach(({ canvas }) => canvas.remove());
        scratchHint.remove();
      }, 650);
    };

    scratchLayers.forEach(layer => {
      drawScratchCoating(layer);
      layer.canvas.addEventListener('pointerdown', event => {
        if (isRevealed) return;
        event.preventDefault();
        layer.canvas.setPointerCapture(event.pointerId);
        const rect = layer.canvas.getBoundingClientRect();
        layer.previousPoint = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      });
      layer.canvas.addEventListener('pointermove', event => {
        if (!layer.previousPoint || isRevealed) return;
        event.preventDefault();
        const rect = layer.canvas.getBoundingClientRect();
        const point = { x: event.clientX - rect.left, y: event.clientY - rect.top };
        const distance = Math.hypot(point.x - layer.previousPoint.x, point.y - layer.previousPoint.y);
        if (distance < 3) return;
        const context = layer.context;
        context.globalCompositeOperation = 'destination-out';
        context.lineCap = 'round';
        context.lineJoin = 'round';
        context.lineWidth = 34;
        context.beginPath();
        context.moveTo(layer.previousPoint.x, layer.previousPoint.y);
        context.lineTo(point.x, point.y);
        context.stroke();
        context.globalCompositeOperation = 'source-over';
        layer.segments.push([layer.previousPoint.x, layer.previousPoint.y, point.x, point.y]);
        layer.previousPoint = point;
        segmentCount += 1;
        if (segmentCount % 3 === 0 && getScratchCoverage() >= .55) revealCountdown();
      });
      const stopScratching = () => { layer.previousPoint = null; };
      layer.canvas.addEventListener('pointerup', stopScratching);
      layer.canvas.addEventListener('pointercancel', stopScratching);
      layer.canvas.addEventListener('keydown', event => {
        if (!isRevealed && (event.code === 'Space' || event.code === 'Enter')) {
          event.preventDefault();
          revealCountdown();
        }
      });
    });
    window.addEventListener('resize', () => {
      if (!isRevealed) scratchLayers.forEach(drawScratchCoating);
    }, { passive: true });
  }
  const petalField = document.querySelector('.petals');
  for (let i = 0; i < 22; i += 1) {
    const petal = document.createElement('i');
    petal.className = 'petal';
    petal.style.left = `${Math.random() * 100}%`;
    petal.style.animationDelay = `${-Math.random() * 24}s`;
    petal.style.animationDuration = `${18 + Math.random() * 20}s`;
    petal.style.setProperty('--drift', `${Math.random() * 180 - 90}px`);
    const size = 8 + Math.random() * 12;
    petal.style.width = `${size}px`;
    petal.style.height = `${size * 1.55}px`;
    petalField.appendChild(petal);
  }

  const header = document.querySelector('.site-header');
  const setHeader = () => header.classList.toggle('scrolled', window.scrollY > 24);
  window.addEventListener('scroll', setHeader, { passive: true });
  setHeader();

  const contactEmail = document.querySelector('#rsvp-form [name="email"]');
  const contactPhone = document.querySelector('#rsvp-form [name="phone"]');
  const contactRequirement = document.getElementById('contact-requirement');
  const whatsappConsentFieldset = document.getElementById('whatsapp-consent');
  const whatsappConsentInputs = [...document.querySelectorAll('#rsvp-form [name="whatsappUpdatesConsent"]')];
  const updateContactRequirement = () => {
    const optedIn = document.querySelector('#rsvp-form [name="eventUpdatesConsent"]:checked')?.value === 'yes';
    contactEmail.required = optedIn;
    contactPhone.required = optedIn;
    whatsappConsentFieldset.hidden = !optedIn;
    whatsappConsentInputs.forEach(input => { input.disabled = !optedIn; input.required = optedIn && input.value === 'yes'; });
    if (!optedIn) document.querySelector('#rsvp-form [name="whatsappUpdatesConsent"][value="no"]').checked = true;
    document.querySelectorAll('#rsvp-form .required-mark').forEach(mark => { mark.hidden = !optedIn; });
    contactRequirement.textContent = optedIn
      ? 'Email and phone are required so we can send you event-day updates.'
      : 'Email and phone are optional unless you opt in to event-day updates.';
  };
  document.querySelectorAll('#rsvp-form [name="eventUpdatesConsent"]').forEach(input => input.addEventListener('change', updateContactRequirement));
  updateContactRequirement();

  const sendToSheets = payload => new Promise((resolve, reject) => {
    if (!SHEETS_WEB_APP_URL.startsWith('https://script.google.com/macros/s/') || !SHEETS_WEB_APP_URL.endsWith('/exec')) {
      reject(new Error('The Google Sheets endpoint has not been configured yet.'));
      return;
    }

    const requestId = window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const frame = document.createElement('iframe');
    frame.name = `sheets-response-${requestId}`;
    frame.title = 'Form submission response';
    frame.className = 'sheets-response-frame';
    frame.setAttribute('aria-hidden', 'true');
    frame.setAttribute('sandbox', 'allow-forms allow-scripts allow-same-origin');
    const transport = document.createElement('form');
    transport.method = 'post';
    transport.action = SHEETS_WEB_APP_URL;
    transport.target = frame.name;
    transport.className = 'sheets-response-transport';
    const payloadField = document.createElement('input');
    payloadField.type = 'hidden';
    payloadField.name = 'payload';
    payloadField.value = JSON.stringify({ ...payload, requestId });
    transport.append(payloadField);
    let timeout;
    let requestSubmitted = false;
    const cleanup = () => {
      window.removeEventListener('message', onMessage);
      frame.removeEventListener('load', onFrameLoad);
      window.clearTimeout(timeout);
      frame.remove();
      transport.remove();
    };
    const onMessage = message => {
      if (message.source !== frame.contentWindow || message.data?.source !== 'wedding-sheets' || message.data?.requestId !== requestId) return;
      cleanup();
      if (message.data.ok) resolve();
      else reject(new Error(message.data.message || 'We could not save your response. Please try again.'));
    };
    const onFrameLoad = () => {
      if (!requestSubmitted) {
        requestSubmitted = true;
        transport.submit();
        return;
      }
      cleanup();
      resolve();
    };
    frame.addEventListener('load', onFrameLoad);
    window.addEventListener('message', onMessage);
    timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error('The submission timed out. Please check your connection and try again.'));
    }, 20000);
    frame.src = 'about:blank';
    document.body.append(frame, transport);
  });

  const attachSheetForm = (form, makePayload, successMessage) => {
    form.addEventListener('submit', async event => {
      event.preventDefault();
      const status = form.querySelector('.form-status');
      const button = form.querySelector('[type="submit"]');
      const payload = makePayload(new FormData(form));
      if (payload.error) {
        status.textContent = payload.error;
        return;
      }
      button.disabled = true;
      status.textContent = 'Sending…';
      try {
        await sendToSheets(payload);
        status.textContent = successMessage;
        form.reset();
        if (form.id === 'rsvp-form') updateContactRequirement();
      } catch (error) {
        status.textContent = error.message;
      } finally {
        button.disabled = false;
      }
    });
  };

  attachSheetForm(document.getElementById('rsvp-form'), data => ({
    type: 'rsvp',
    name: data.get('name'),
    attendance: data.get('attendance'),
    email: data.get('email'),
    phone: data.get('phone'),
    eventUpdatesConsent: data.get('eventUpdatesConsent'),
    whatsappUpdatesConsent: data.get('whatsappUpdatesConsent') || 'no',
    message: data.get('message'),
    website: data.get('website')
  }), 'Thank you! Your RSVP has been received.');

  attachSheetForm(document.getElementById('guest-notes-form'), data => {
    const wishOrMemory = String(data.get('wishOrMemory') || '').trim();
    const marriedLifeAdvice = String(data.get('marriedLifeAdvice') || '').trim();
    if (!wishOrMemory && !marriedLifeAdvice) return { error: 'Please share a wish, memory, or a little advice before sending.' };
    return {
      type: 'guest_note',
      name: data.get('name'),
      wishOrMemory,
      marriedLifeAdvice,
      website: data.get('website')
    };
  }, 'Thank you for sharing your words with us.');
  document.getElementById('copy-link').addEventListener('click', async event => {
    const button = event.currentTarget;
    try {
      await navigator.clipboard.writeText(window.location.href);
      button.innerHTML = '<span>✓</span> Copied!';
      window.setTimeout(() => { button.innerHTML = '<span>↗</span> Copy Link'; }, 1800);
    } catch {
      button.innerHTML = '<span>↗</span> Copy unavailable';
    }
  });
})();
