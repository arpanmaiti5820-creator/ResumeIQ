(function () {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* nav gets an ink underline once the page scrolls */
  const nav = document.getElementById('nav');
  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 8);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* paper follows the pointer slightly */
  const stage = document.getElementById('stage');
  const paper = document.getElementById('paper');
  if (stage && paper && !reduce && window.matchMedia('(hover: hover)').matches) {
    stage.addEventListener('pointermove', (e) => {
      const r = stage.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      paper.style.setProperty('--ry', `${(x * 5).toFixed(2)}deg`);
      paper.style.setProperty('--rx', `${(-y * 4).toFixed(2)}deg`);
    });
    stage.addEventListener('pointerleave', () => {
      paper.style.setProperty('--rx', '0deg');
      paper.style.setProperty('--ry', '0deg');
    });
  }

  /* start sample animations when they scroll into view */
  const targets = document.querySelectorAll('[data-in]');
  if ('IntersectionObserver' in window && !reduce) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            en.target.classList.add('in');
            io.unobserve(en.target);
          }
        });
      },
      { threshold: 0.35 }
    );
    targets.forEach((t) => io.observe(t));
  } else {
    targets.forEach((t) => t.classList.add('in'));
  }

  /* FAQ accordion */
  document.querySelectorAll('.acc-q').forEach((btn) => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.acc-item');
      const open = !item.classList.contains('open');
      document.querySelectorAll('.acc-item.open').forEach((i) => {
        i.classList.remove('open');
        i.querySelector('.acc-q').setAttribute('aria-expanded', 'false');
      });
      if (open) {
        item.classList.add('open');
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  });

  /* if already signed in, point the buttons at the dashboard */
  fetch('/api/auth/me', { credentials: 'same-origin' })
    .then((r) => (r.ok ? r.json() : null))
    .then((data) => {
      if (!data || !data.user) return;
      const start = document.getElementById('nav-start');
      const login = document.getElementById('nav-login');
      start.href = '/dashboard';
      start.querySelector('span').textContent = 'Open dashboard';
      if (login) login.hidden = true;
      document.querySelectorAll('a[href="/register"]').forEach((a) => {
        a.href = '/dashboard';
        const s = a.querySelector('span');
        if (s) s.textContent = 'Open dashboard';
      });
    })
    .catch(() => {});
})();
