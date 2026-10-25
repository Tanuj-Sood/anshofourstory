(() => {
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
    const scratchCanvas = document.createElement('canvas');
    scratchCanvas.className = 'countdown-scratch';
    scratchCanvas.setAttribute('role', 'button');
    scratchCanvas.setAttribute('aria-label', 'Scratch across the cards to reveal the wedding countdown. Press Space or Enter to reveal.');
    scratchCanvas.tabIndex = 0;
    const scratchHint = document.createElement('span');
    scratchHint.className = 'countdown-scratch-hint';
    scratchHint.textContent = 'Scratch across the cards to reveal your countdown';
    countdown.setAttribute('aria-hidden', 'true');
    countdown.append(scratchCanvas, scratchHint);

    const scratchContext = scratchCanvas.getContext('2d');
    const scratchedSegments = [];
    let cardRects = [];
    let pixelRatio = 1;
    let previousPoint = null;
    let isRevealed = false;

    const roundedRect = (context, x, y, width, height, radius) => {
      context.beginPath();
      context.roundRect(x, y, width, height, radius);
    };

    const drawScratchCoating = () => {
      const bounds = countdown.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      scratchCanvas.width = Math.round(bounds.width * pixelRatio);
      scratchCanvas.height = Math.round(bounds.height * pixelRatio);
      scratchCanvas.style.width = `${bounds.width}px`;
      scratchCanvas.style.height = `${bounds.height}px`;
      scratchContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      cardRects = [...countdown.querySelectorAll('.time-card')].map(card => {
        const rect = card.getBoundingClientRect();
        return { x: rect.left - bounds.left, y: rect.top - bounds.top, width: rect.width, height: rect.height };
      });

      cardRects.forEach(rect => {
        const radius = Math.min(13, rect.width * .14);
        const gradient = scratchContext.createLinearGradient(rect.x, rect.y, rect.x + rect.width, rect.y + rect.height);
        gradient.addColorStop(0, '#f8eef0');
        gradient.addColorStop(.48, '#e9cbd1');
        gradient.addColorStop(1, '#d9b1ba');
        roundedRect(scratchContext, rect.x, rect.y, rect.width, rect.height, radius);
        scratchContext.fillStyle = gradient;
        scratchContext.fill();
        scratchContext.save();
        roundedRect(scratchContext, rect.x, rect.y, rect.width, rect.height, radius);
        scratchContext.clip();
        scratchContext.strokeStyle = 'rgba(255,255,255,.27)';
        scratchContext.lineWidth = 1;
        for (let x = rect.x - rect.height; x < rect.x + rect.width + rect.height; x += 9) {
          scratchContext.beginPath();
          scratchContext.moveTo(x, rect.y);
          scratchContext.lineTo(x + rect.height, rect.y + rect.height);
          scratchContext.stroke();
        }
        scratchContext.restore();
        roundedRect(scratchContext, rect.x + .5, rect.y + .5, rect.width - 1, rect.height - 1, radius);
        scratchContext.strokeStyle = 'rgba(199,178,125,.88)';
        scratchContext.lineWidth = 1;
        scratchContext.stroke();

        scratchContext.textAlign = 'center';
        scratchContext.textBaseline = 'middle';
        scratchContext.fillStyle = '#9a6d78';
        scratchContext.font = '400 13px Georgia, serif';
        scratchContext.fillText('✦', rect.x + rect.width / 2, rect.y + rect.height / 2 - 20);
        scratchContext.fillStyle = '#815d66';
        scratchContext.font = `500 ${rect.width < 75 ? 7 : 8}px Arial, sans-serif`;
        scratchContext.fillText('SCRATCH', rect.x + rect.width / 2, rect.y + rect.height / 2 - 3);
        scratchContext.fillStyle = '#9a6d78';
        scratchContext.font = `400 ${rect.width < 75 ? 6 : 7}px Arial, sans-serif`;
        scratchContext.fillText('TO REVEAL', rect.x + rect.width / 2, rect.y + rect.height / 2 + 10);
      });

      if (scratchedSegments.length) {
        scratchContext.globalCompositeOperation = 'destination-out';
        scratchContext.lineCap = 'round';
        scratchContext.lineJoin = 'round';
        scratchContext.lineWidth = 34;
        scratchedSegments.forEach(segment => {
          scratchContext.beginPath();
          scratchContext.moveTo(segment[0], segment[1]);
          scratchContext.lineTo(segment[2], segment[3]);
          scratchContext.stroke();
        });
        scratchContext.globalCompositeOperation = 'source-over';
      }
    };

    const getScratchCoverage = () => {
      const image = scratchContext.getImageData(0, 0, scratchCanvas.width, scratchCanvas.height).data;
      let sampled = 0;
      let cleared = 0;
      cardRects.forEach(rect => {
        for (let y = rect.y + 6; y < rect.y + rect.height - 6; y += 12) {
          for (let x = rect.x + 6; x < rect.x + rect.width - 6; x += 12) {
            const index = (Math.floor(y * pixelRatio) * scratchCanvas.width + Math.floor(x * pixelRatio)) * 4 + 3;
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
      scratchCanvas.classList.add('is-revealed');
      scratchCanvas.setAttribute('aria-hidden', 'true');
      scratchCanvas.tabIndex = -1;
      scratchHint.classList.add('is-hidden');
      countdown.removeAttribute('aria-hidden');
      window.setTimeout(() => {
        scratchCanvas.remove();
        scratchHint.remove();
      }, 650);
    };

    drawScratchCoating();
    window.addEventListener('resize', drawScratchCoating, { passive: true });

    scratchCanvas.addEventListener('pointerdown', event => {
      if (isRevealed) return;
      event.preventDefault();
      scratchCanvas.setPointerCapture(event.pointerId);
      const rect = scratchCanvas.getBoundingClientRect();
      previousPoint = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    });
    scratchCanvas.addEventListener('pointermove', event => {
      if (!previousPoint || isRevealed) return;
      event.preventDefault();
      const rect = scratchCanvas.getBoundingClientRect();
      const point = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      const distance = Math.hypot(point.x - previousPoint.x, point.y - previousPoint.y);
      if (distance < 3) return;
      scratchContext.globalCompositeOperation = 'destination-out';
      scratchContext.lineCap = 'round';
      scratchContext.lineJoin = 'round';
      scratchContext.lineWidth = 34;
      scratchContext.beginPath();
      scratchContext.moveTo(previousPoint.x, previousPoint.y);
      scratchContext.lineTo(point.x, point.y);
      scratchContext.stroke();
      scratchContext.globalCompositeOperation = 'source-over';
      scratchedSegments.push([previousPoint.x, previousPoint.y, point.x, point.y]);
      previousPoint = point;
      if (scratchedSegments.length % 3 === 0 && getScratchCoverage() >= .55) revealCountdown();
    });
    const stopScratching = () => { previousPoint = null; };
    scratchCanvas.addEventListener('pointerup', stopScratching);
    scratchCanvas.addEventListener('pointercancel', stopScratching);
    scratchCanvas.addEventListener('keydown', event => {
      if (!isRevealed && (event.code === 'Space' || event.code === 'Enter')) {
        event.preventDefault();
        revealCountdown();
      }
    });
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

  document.getElementById('rsvp-form').addEventListener('submit', event => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const status = document.querySelector('.form-status');
    status.textContent = `Thank you, ${data.get('name')} — your RSVP has been noted.`;
    event.currentTarget.reset();
    event.currentTarget.querySelector('[name="guests"]').value = '1';
  });

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
