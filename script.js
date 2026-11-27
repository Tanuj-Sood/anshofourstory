(() => {
  const SHEETS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbyoeRyjp3fwyiSUPhMU4YcDRXo6SamagXn7HryZCHW05ZkfQKTCyHmnVATpQEIkNSgJ6Q/exec';
  const invitation = document.getElementById('invitation-preloader');
  const invitationButton = document.getElementById('invitation-open');
  const plannerAudio = document.getElementById('planner-audio');
  document.body.classList.add('invitation-locked');
  invitationButton.addEventListener('click', () => {
    if (invitation.classList.contains('is-opening')) return;
    let plannerAudioStarted = Promise.resolve(false);
    if (plannerAudio) {
      plannerAudio.volume = 0;
      const playback = plannerAudio.play();
      plannerAudioStarted = playback
        ? playback.then(() => true).catch(() => false)
        : Promise.resolve(!plannerAudio.paused);
    }
    invitation.classList.add('is-opening');
    invitationButton.disabled = true;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.setTimeout(() => {
      invitation.classList.add('is-departing');
      plannerAudioStarted.then(isPlaying => {
        if (!isPlaying || !plannerAudio) return;
        plannerAudio.currentTime = 0;
        const fadeDuration = reducedMotion ? 120 : 850;
        const fadeStarted = performance.now();
        const fadeIn = now => {
          const progress = Math.min((now - fadeStarted) / fadeDuration, 1);
          plannerAudio.volume = 0.58 * progress;
          if (progress < 1) window.requestAnimationFrame(fadeIn);
        };
        window.requestAnimationFrame(fadeIn);
      });
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
    const digits = [...countdown.querySelectorAll('.time-card > span')];
    digits.forEach(digit => digit.setAttribute('aria-hidden', 'true'));
    countdown.append(scratchHint);

    const canvas = document.createElement('canvas');
    canvas.className = 'countdown-scratch';
    countdown.style.position = 'relative';
    canvas.style.position = 'absolute';
    canvas.setAttribute('role', 'button');
    canvas.setAttribute('aria-label', 'Scratch across the countdown cards to reveal the wedding countdown. Press Space or Enter to reveal.');
    canvas.tabIndex = 0;
    countdown.append(canvas);
    const context = canvas.getContext('2d');
    const scratch = { segments: [], previousPoint: null };
    let pixelRatio = 1;
    let isRevealed = false;
    let segmentCount = 0;
    let lastPetalAt = 0;
    const scratchPetalColors = ['#628b50', '#e8b8c2', '#b82e3a', '#9671b8'];

    const getSurface = () => {
      const cards = [...countdown.querySelectorAll('.time-card')];
      const parent = (canvas.offsetParent || countdown).getBoundingClientRect();
      const bounds = cards.map(card => card.getBoundingClientRect());
      return {
        left: bounds[0].left - parent.left,
        top: bounds[0].top - parent.top,
        width: bounds[bounds.length - 1].right - bounds[0].left,
        height: Math.max.apply(null, bounds.map(rect => rect.height))
      };
    };
    const roundedRect = (ctx, x, y, width, height, radius) => {
      ctx.beginPath();
      ctx.roundRect(x, y, width, height, radius);
    };
    const drawScratchCoating = () => {
      const surface = getSurface();
      if (!surface.width || !surface.height) return;
      pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(surface.width * pixelRatio);
      canvas.height = Math.round(surface.height * pixelRatio);
      canvas.style.left = surface.left + 'px';
      canvas.style.top = surface.top + 'px';
      canvas.style.width = surface.width + 'px';
      canvas.style.height = surface.height + 'px';
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      const radius = Math.min(13, surface.height * .14);
      const gradient = context.createLinearGradient(0, 0, surface.width, surface.height);
      gradient.addColorStop(0, '#f8eef0');
      gradient.addColorStop(.48, '#e9cbd1');
      gradient.addColorStop(1, '#d9b1ba');
      roundedRect(context, 0, 0, surface.width, surface.height, radius);
      context.fillStyle = gradient;
      context.fill();
      context.save();
      roundedRect(context, 0, 0, surface.width, surface.height, radius);
      context.clip();
      context.strokeStyle = 'rgba(255,255,255,.27)';
      context.lineWidth = 1;
      for (let x = -surface.height; x < surface.width + surface.height; x += 9) {
        context.beginPath();
        context.moveTo(x, 0);
        context.lineTo(x + surface.height, surface.height);
        context.stroke();
      }
      context.restore();
      roundedRect(context, .5, .5, surface.width - 1, surface.height - 1, radius);
      context.strokeStyle = 'rgba(199,178,125,.88)';
      context.lineWidth = 1;
      context.stroke();
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillStyle = '#9a6d78';
      context.font = '400 13px Georgia, serif';
      context.fillText('*', surface.width / 2, surface.height / 2 - 20);
      context.fillStyle = '#815d66';
      context.font = '500 8px Arial, sans-serif';
      context.fillText('SCRATCH', surface.width / 2, surface.height / 2 - 3);
      context.fillStyle = '#9a6d78';
      context.font = '400 7px Arial, sans-serif';
      context.fillText('TO REVEAL', surface.width / 2, surface.height / 2 + 10);
      if (scratch.segments.length) {
        context.globalCompositeOperation = 'destination-out';
        context.lineCap = 'round';
        context.lineJoin = 'round';
        context.lineWidth = 34;
        scratch.segments.forEach(segment => {
          context.beginPath();
          context.moveTo(segment[0], segment[1]);
          context.lineTo(segment[2], segment[3]);
          context.stroke();
        });
        context.globalCompositeOperation = 'source-over';
      }
    };
    const getScratchCoverage = () => {
      const width = canvas.width / pixelRatio;
      const height = canvas.height / pixelRatio;
      const image = context.getImageData(0, 0, canvas.width, canvas.height).data;
      let sampled = 0;
      let cleared = 0;
      for (let y = 6; y < height - 6; y += 12) {
        for (let x = 6; x < width - 6; x += 12) {
          const index = (Math.floor(y * pixelRatio) * canvas.width + Math.floor(x * pixelRatio)) * 4 + 3;
          sampled++;
          if (image[index] < 80) cleared++;
        }
      }
      return sampled ? cleared / sampled : 0;
    };
    const makeScratchPetals = point => {
      const now = Date.now();
      if (now - lastPetalAt < 55) return;
      lastPetalAt = now;
      const surface = getSurface();
      for (let i = 0; i < 2; i++) {
        const petal = document.createElement('i');
        petal.className = 'scratch-petal';
        petal.setAttribute('aria-hidden', 'true');
        petal.style.backgroundColor = scratchPetalColors[Math.floor(Math.random() * scratchPetalColors.length)];
        petal.style.left = (surface.left + point.x + (Math.random() * 18 - 9)) + 'px';
        petal.style.top = (surface.top + point.y - 4) + 'px';
        petal.style.setProperty('--petal-drift', (Math.random() * 54 - 27) + 'px');
        petal.style.animationDuration = (0.85 + Math.random() * 0.45) + 's';
        countdown.append(petal);
        window.setTimeout(() => petal.remove(), 1400);
      }
    };
    const revealCountdown = () => {
      if (isRevealed) return;
      isRevealed = true;
      canvas.classList.add('is-revealed');
      canvas.setAttribute('aria-hidden', 'true');
      canvas.tabIndex = -1;
      scratchHint.classList.add('is-hidden');
      digits.forEach(digit => digit.removeAttribute('aria-hidden'));
      window.setTimeout(() => { canvas.remove(); scratchHint.remove(); }, 650);
    };

    drawScratchCoating();
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
      if (!isRevealed) drawScratchCoating();
    }));
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => { if (!isRevealed) drawScratchCoating(); });
    }
    canvas.addEventListener('pointerdown', event => {
      if (isRevealed) return;
      event.preventDefault();
      canvas.setPointerCapture(event.pointerId);
      const rect = canvas.getBoundingClientRect();
      scratch.previousPoint = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    });
    canvas.addEventListener('pointermove', event => {
      if (!scratch.previousPoint || isRevealed) return;
      event.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const point = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      if (Math.hypot(point.x - scratch.previousPoint.x, point.y - scratch.previousPoint.y) < 3) return;
      context.globalCompositeOperation = 'destination-out';
      context.lineCap = 'round';
      context.lineJoin = 'round';
      context.lineWidth = 34;
      context.beginPath();
      context.moveTo(scratch.previousPoint.x, scratch.previousPoint.y);
      context.lineTo(point.x, point.y);
      context.stroke();
      context.globalCompositeOperation = 'source-over';
      scratch.segments.push([scratch.previousPoint.x, scratch.previousPoint.y, point.x, point.y]);
      scratch.previousPoint = point;
      segmentCount++;
      makeScratchPetals(point);
      if (segmentCount % 3 === 0 && getScratchCoverage() >= .45) revealCountdown();
    });
    const stopScratching = () => { scratch.previousPoint = null; };
    canvas.addEventListener('pointerup', stopScratching);
    canvas.addEventListener('pointercancel', stopScratching);
    canvas.addEventListener('keydown', event => {
      if (!isRevealed && (event.code === 'Space' || event.code === 'Enter')) {
        event.preventDefault();
        revealCountdown();
      }
    });
    window.addEventListener('resize', () => { if (!isRevealed) drawScratchCoating(); }, { passive: true });
  }
  const petalField = document.getElementById('falling-petals');
  if (petalField) {
    const tones = [
      { id: 'haldi', color: '#e6ad22' },
      { id: 'mehndi', color: '#628b50' },
      { id: 'engagement', color: '#9671b8' },
      { id: 'wedding', color: '#b82e3a' }
    ];
    const eventSections = tones.map(tone => ({ ...tone, section: document.querySelector(`[data-petal-tone="${tone.id}"]`) })).filter(tone => tone.section);
    const petals = [];
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
      petals.push(petal);
      petalField.appendChild(petal);
    }
    const paintPetals = () => {
      const scrollY = window.scrollY;
      const eventStarts = eventSections.map(tone => ({ color: tone.color, top: tone.section.getBoundingClientRect().top + scrollY }));
      const weddingSection = eventSections.find(tone => tone.id === 'wedding')?.section;
      const weddingBottom = weddingSection ? weddingSection.getBoundingClientRect().bottom + scrollY : Infinity;
      petals.forEach(petal => {
        const fallingY = petal.getBoundingClientRect().top + scrollY;
        let color = '#e8b8c2';
        eventStarts.forEach(tone => {
          if (fallingY >= tone.top) color = tone.color;
        });
        if (fallingY >= weddingBottom) color = '#e8b8c2';
        if (petal.dataset.toneColor !== color) {
          petal.dataset.toneColor = color;
          petal.style.backgroundColor = color;
        }
      });
      window.requestAnimationFrame(paintPetals);
    };
    window.requestAnimationFrame(paintPetals);
  } else {
    const existingPetalField = document.querySelector('.petals');
    if (existingPetalField) {
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
        existingPetalField.appendChild(petal);
      }
    }
  }

  const header = document.querySelector('.site-header');
  const setHeader = () => header.classList.toggle('scrolled', window.scrollY > 24);
  window.addEventListener('scroll', setHeader, { passive: true });
  setHeader();

  const scrollRevealElements = document.querySelectorAll('.scroll-reveal');
  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.16 });
    scrollRevealElements.forEach(element => revealObserver.observe(element));
  } else {
    scrollRevealElements.forEach(element => element.classList.add('is-visible'));
  }

  const rsvpForm = document.getElementById('rsvp-form');
  if (rsvpForm) {
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
    return {
      type: 'guest_note',
      name: data.get('name'),
      wishOrMemory,
      marriedLifeAdvice,
      website: data.get('website')
    };
  }, 'Thank you for sharing your words with us.');
  }
  const copyLinkButton = document.getElementById('copy-link');
  if (copyLinkButton) copyLinkButton.addEventListener('click', async event => {
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
