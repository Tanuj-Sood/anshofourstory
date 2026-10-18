(() => {
  const target = new Date('2027-02-12T11:00:00+05:30').getTime();
  const fields = ['days', 'hours', 'minutes', 'seconds'].map(id => document.getElementById(id));
  const updateCountdown = () => {
    const remaining = Math.max(0, target - Date.now());
    const values = [Math.floor(remaining / 86400000), Math.floor(remaining / 3600000) % 24, Math.floor(remaining / 60000) % 60, Math.floor(remaining / 1000) % 60];
    fields.forEach((field, index) => { field.textContent = String(values[index]).padStart(2, '0'); });
  };
  updateCountdown();
  window.setInterval(updateCountdown, 1000);

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

  const banner = document.getElementById('cookie-banner');
  if (localStorage.getItem('wedding-cookie-choice')) banner.classList.add('hidden');
  banner.querySelectorAll('[data-cookie]').forEach(button => button.addEventListener('click', () => {
    localStorage.setItem('wedding-cookie-choice', button.dataset.cookie);
    banner.classList.add('hidden');
  }));

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
