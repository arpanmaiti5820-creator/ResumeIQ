/* Shared helpers: fetch wrapper, toasts, escaping, animated page transitions */
(function () {
  const RIQ = (window.RIQ = window.RIQ || {});

  RIQ.esc = (value) =>
    String(value == null ? '' : value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /** JSON/FormData fetch. Throws Error with .status and .data on failure. */
  RIQ.api = async function api(path, { method = 'GET', body, form } = {}) {
    const opts = { method, credentials: 'same-origin', headers: {} };
    if (form) {
      opts.body = form;
    } else if (body !== undefined) {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
    let res;
    try {
      res = await fetch(path, opts);
    } catch {
      throw Object.assign(new Error('Cannot reach the server. Check your connection and try again.'), { status: 0 });
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw Object.assign(new Error(data.message || 'Something went wrong. Try again.'), { status: res.status, data });
    return data;
  };

  /* toasts */
  RIQ.toast = function toast(message, type = 'info', ms = 4200) {
    let box = document.querySelector('.toasts');
    if (!box) {
      box = document.createElement('div');
      box.className = 'toasts';
      box.setAttribute('role', 'status');
      box.setAttribute('aria-live', 'polite');
      document.body.appendChild(box);
    }
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `<i></i><span>${RIQ.esc(message)}</span>`;
    box.appendChild(el);
    setTimeout(() => {
      el.classList.add('out');
      setTimeout(() => el.remove(), 320);
    }, ms);
  };

  /* page transitions */
  const root = document.documentElement;
  let leaving = false;

  RIQ.go = function go(url) {
    if (leaving) return;
    leaving = true;
    root.classList.add('is-leaving');
    setTimeout(() => { window.location.href = url; }, 620);
  };

  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest('a[href]');
    if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
    const href = a.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
    const url = new URL(a.href, window.location.href);
    if (url.origin !== window.location.origin) return;
    if (url.pathname === window.location.pathname && url.search === window.location.search) return;
    e.preventDefault();
    RIQ.go(url.pathname + url.search + url.hash);
  });

  // Back/forward cache: clear the cover when returning to a cached page
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) {
      leaving = false;
      root.classList.remove('is-leaving');
    }
  });

  /* show/hide password buttons: <button class="eye" data-eye="inputId"> */
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-eye]');
    if (!btn) return;
    const input = document.getElementById(btn.dataset.eye);
    if (!input) return;
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    btn.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
    btn.classList.toggle('on', show);
  });

  RIQ.setLoading = (btn, on) => {
    btn.classList.toggle('is-loading', on);
    btn.disabled = on;
  };
})();
