/* Login, register, forgot password and reset password */
(function () {
  const { api, go, setLoading } = window.RIQ;
  const form = document.getElementById('auth-form');
  const errorBox = document.getElementById('form-error');
  const kind = document.body.dataset.page;

  function showError(message) {
    errorBox.textContent = message;
    errorBox.classList.add('show');
    const card = document.querySelector('.auth-card');
    card.classList.remove('shake');
    void card.offsetWidth; // restart animation
    card.classList.add('shake');
  }
  function clearError() { errorBox.classList.remove('show'); }

  /* password strength meter (register + reset) */
  const pw = document.getElementById('password');
  const meter = document.getElementById('meter');
  const meterLabel = document.getElementById('meter-label');
  if (pw && meter) {
    const labels = ['', 'Too weak', 'Okay', 'Good', 'Strong'];
    pw.addEventListener('input', () => {
      const v = pw.value;
      let s = 0;
      if (v.length >= 8) s += 1;
      if (/[A-Za-z]/.test(v) && /\d/.test(v)) s += 1;
      if (v.length >= 12) s += 1;
      if (/[^A-Za-z0-9]/.test(v) && v.length >= 8) s += 1;
      if (!v) s = 0;
      meter.dataset.s = s;
      meterLabel.textContent = v ? labels[s] || labels[1] : 'Use 8+ characters with a letter and a number.';
    });
  }

  /* Google sign-in (login + register) */
  async function initGoogle() {
    const slot = document.getElementById('google-slot');
    if (!slot) return;
    let clientId = null;
    try { clientId = (await api('/api/auth/config')).googleClientId; } catch { /* ignore */ }

    if (!clientId) {
      slot.innerHTML = `<button type="button" class="btn btn-block btn-google" id="g-fallback">${googleIcon()}<span>Continue with Google</span></button>`;
      document.getElementById('g-fallback').addEventListener('click', () => {
        window.RIQ.toast('Google sign-in is not set up yet. Add GOOGLE_CLIENT_ID to the .env file.', 'error', 6000);
      });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = () => {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (resp) => {
          clearError();
          try {
            await api('/api/auth/google', { method: 'POST', body: { credential: resp.credential } });
            go('/dashboard');
          } catch (err) { showError(err.message); }
        },
      });
      window.google.accounts.id.renderButton(slot, {
        theme: 'outline', size: 'large', shape: 'rectangular', text: 'continue_with',
        width: Math.min(400, slot.clientWidth || 380), logo_alignment: 'center',
      });
    };
    script.onerror = () => showError('Could not load Google sign-in. Check your connection.');
    document.head.appendChild(script);
  }
  function googleIcon() {
    return '<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z"/><path fill="#FBBC05" d="M10.5 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg>';
  }
  initGoogle();
  async function initGoogle() {
    const slot = document.getElementById('google-slot');
    if (!slot) return;

    // get the client id from the server
    let clientId = null;
    try { clientId = (await api('/api/auth/config')).googleClientId; } catch { }
    if (!clientId) return;

    // load Google's script
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = () => {
      google.accounts.id.initialize({
        client_id: clientId,
        callback: async (resp) => {
          try {
            await api('/api/auth/google', { method: 'POST', body: { credential: resp.credential } });
            go('/dashboard');
          } catch (err) { showError(err.message); }
        },
      });
      google.accounts.id.renderButton(slot, {
        theme: 'outline', size: 'large', text: 'continue_with', width: 380,
      });
    };
    document.head.appendChild(script);
  }
  initGoogle();
  /* submit */
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearError();
    const btn = form.querySelector('button[type="submit"]');
    const val = (id) => (document.getElementById(id) ? document.getElementById(id).value : '');

    try {
      if (kind === 'register') {
        setLoading(btn, true);
        await api('/api/auth/register', { method: 'POST', body: { name: val('name'), email: val('email'), password: val('password') } });
        window.RIQ.toast('Account created. Taking you to your dashboard.', 'success');
        go('/dashboard');
      } else if (kind === 'login') {
        setLoading(btn, true);
        await api('/api/auth/login', { method: 'POST', body: { email: val('email'), password: val('password') } });
        go('/dashboard');
      } else if (kind === 'forgot') {
        setLoading(btn, true);
        const data = await api('/api/auth/forgot-password', { method: 'POST', body: { email: val('email') } });
        showSent(val('email'), data.devResetUrl);
        setLoading(btn, false);
      } else if (kind === 'reset') {
        if (val('password') !== val('confirm')) throw new Error('The two passwords do not match.');
        setLoading(btn, true);
        const token = window.location.pathname.split('/').pop();
        await api(`/api/auth/reset-password/${encodeURIComponent(token)}`, { method: 'POST', body: { password: val('password') } });
        window.RIQ.toast('Password updated. You are logged in.', 'success');
        go('/dashboard');
      }
    } catch (err) {
      setLoading(btn, false);
      showError(err.message);
    }
  });

  function showSent(email, devUrl) {
    const card = document.getElementById('card-body');
    const safe = window.RIQ.esc(email);
    card.innerHTML = `
      <div class="sent swap-in">
        <svg class="tick" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="29"/><path d="M19 33l9 9 17-20"/></svg>
        <h1>Check your inbox</h1>
        <p class="intro">If an account exists for <b>${safe}</b>, a reset link is on its way. It works for 15 minutes.</p>
        ${devUrl ? `<div class="dev-box"><b>Development mode: email is not set up.</b><a href="${window.RIQ.esc(devUrl)}">Open the reset link</a></div>` : ''}
        <p class="auth-foot" style="text-align:left"><a href="/login">Back to log in</a></p>
      </div>`;
  }
})();
