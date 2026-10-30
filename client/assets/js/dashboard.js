(function () {
  const { api, esc, toast, go } = window.RIQ;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  const VIEWS = { overview: 'Overview', resume: 'My CV', questions: 'Interview questions', prep: 'Company prep', review: 'CV review' };
  const CATS = { skills: 'Skills', projects: 'Projects', behavioral: 'HR and behavioral' };
  const ISSUE_TYPES = {
    keyword: 'Keyword',
    unprofessional: 'Unprofessional wording',
    grammar: 'Grammar and spelling',
    weak_phrase: 'Weak phrasing',
    formatting: 'Formatting',
    missing: 'Missing information',
  };
  const SCORE_LABELS = { ats: 'ATS-friendly', clarity: 'Clarity', professionalism: 'Professionalism', impact: 'Impact' };

  const state = {
    user: null,
    resume: null,
    view: 'overview',
    qFilter: { cat: 'all', diff: 'all', q: '' },
    rFilter: 'all',
    uploading: false,
    preps: [],
    prep: null,
    pFilter: 'all',
    busy: false,
  };

  /* ───────── helpers ───────── */
  const fmtSize = (b) => (b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
  const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const tier = (n) => (n >= 80 ? { cls: 'ok', label: 'Strong CV' } : n >= 65 ? { cls: 'ok', label: 'Good, with fixes to make' } : n >= 50 ? { cls: 'mid', label: 'Getting there' } : { cls: 'low', label: 'Needs work' });

  function ring(score) {
    const size = 150;
    const r = 63;
    const c = 2 * Math.PI * r;
    const target = c * (1 - score / 100);
    return `<svg class="ring" viewBox="0 0 ${size} ${size}" role="img" aria-label="Overall score ${score} out of 100">
      <circle class="bg" cx="75" cy="75" r="${r}"/>
      <circle class="fg" cx="75" cy="75" r="${r}" stroke-dasharray="${c.toFixed(2)}" stroke-dashoffset="${c.toFixed(2)}" data-target="${target.toFixed(2)}"/>
      <text x="75" y="76" data-count="${score}">0</text>
    </svg>`;
  }

  function animateIn(scope) {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        $$('.ring .fg', scope).forEach((c) => { c.style.strokeDashoffset = c.dataset.target; });
        $$('[data-count]', scope).forEach((el) => {
          const to = Number(el.dataset.count);
          const t0 = performance.now();
          const dur = 1300;
          const tick = (now) => {
            const p = Math.min(1, (now - t0) / dur);
            el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3)));
            if (p < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        });
      });
    });
  }

  /* the opened part of a question card: why it is asked, how to approach it, sample answer, follow-ups, mistake */
  function qInner(q) {
    const out = [];
    if (q.whyAsked) out.push(`<p><b>What they are testing</b>${esc(q.whyAsked)}</p>`);
    if (q.tip) out.push(`<p><b>How to approach it</b>${esc(q.tip)}</p>`);
    if (q.modelAnswer) out.push(`<p class="ans"><b>Sample answer</b>${esc(q.modelAnswer)}</p>`);
    if (q.followUps && q.followUps.length) out.push(`<div class="fu"><b>Likely follow-up questions</b><ul>${q.followUps.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>`);
    if (q.mistake) out.push(`<p class="mist"><b>Common mistake</b>${esc(q.mistake)}</p>`);
    return out.join('');
  }

  /* ───────── templates ───────── */
  const uploadIcon = '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M14 38h20a8 8 0 0 0 1.5-15.9A11 11 0 0 0 14.2 19 9 9 0 0 0 14 38z"/><path d="M24 31V19m0 0l-5 5m5-5l5 5"/></svg>';

  function dropzone({ title, hint, big = false }) {
    return `<label class="dropzone ${big ? 'hero-drop' : ''}" tabindex="0">
      <input type="file" class="file-in" accept=".pdf,.docx,.txt" hidden>
      ${uploadIcon}
      <strong>${esc(title)}</strong>
      <span class="hint">${esc(hint)}</span>
      <em class="btn btn-hl"><span>Choose a file</span></em>
    </label>`;
  }

  function emptyState(what) {
    const copy = {
      overview: ['No CV analyzed yet', 'Upload your CV and your score, questions and fixes will show up here.'],
      questions: ['No questions yet', 'Upload your CV and we will write the questions a recruiter could ask about your skills and projects.'],
      prep: ['Upload your CV first', 'Company practice questions are built from the skills and projects on your CV.'],
      review: ['Nothing to review yet', 'Upload your CV and we will mark wrong keywords, unprofessional wording and weak phrases.'],
    }[what];
    return `<div class="empty rise"><h3>${copy[0]}</h3><p>${copy[1]}</p><button class="btn btn-primary" data-go="resume"><span>Upload your CV</span></button></div>`;
  }

  function overviewHTML() {
    if (!state.resume) {
      return `<div class="rise" style="--i:0">${dropzone({ title: 'Drop your CV here', hint: 'PDF, DOCX or TXT, up to 5 MB.', big: true })}</div>
        <div class="after-drop rise" style="--i:1">
          <div><b>Interview questions</b><span>From the skills and projects on your CV.</span></div>
          <div><b>Wording check</b><span>Wrong keywords, slang and weak phrases, with fixes.</span></div>
          <div><b>A score</b><span>So you know what to fix first.</span></div>
        </div>`;
    }
    const r = state.resume;
    const a = r.analysis;
    const s = a.scores;
    const t = tier(s.overall);
    const firstIssues = [...a.issues].sort((x, y) => ['high', 'medium', 'low'].indexOf(x.severity) - ['high', 'medium', 'low'].indexOf(y.severity)).filter((i) => i.found).slice(0, 3);

    return `
      <div class="report">
        <div class="score-card rise" style="--i:0">
          ${ring(s.overall)}
          <div>
            <span class="tier ${t.cls}">${t.label}</span>
            <h2>${esc(a.headline || 'Your CV')}</h2>
            <p class="summary">${esc(a.summary)}</p>
            <p class="meta">${esc(r.fileName)}, analyzed ${fmtDate(r.analyzedAt)}</p>
          </div>
        </div>
        <div class="ledger rise" style="--i:1">
          <button class="ledger-row" data-go="questions"><span>Questions to prepare<span class="go">Open the list</span></span><b>${a.questions.length}</b></button>
          <button class="ledger-row" data-go="review"><span>Issues to fix<span class="go">See each fix</span></span><b>${a.issues.length}</b></button>
          <div class="ledger-row"><span>Skills found</span><b>${a.skills.length}</b></div>
          <div class="ledger-row"><span>Projects found</span><b>${a.projects.length}</b></div>
        </div>
      </div>

      <div class="two">
        <div class="panel rise" style="--i:2">
          <h3>What already works</h3>
          ${a.strengths.length ? `<ul class="list good">${a.strengths.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : '<p class="summary">No standout strengths were found.</p>'}
        </div>
        <div class="panel rise" style="--i:3">
          <h3>Fix these first</h3>
          ${firstIssues.length
        ? `<div class="fixfirst">${firstIssues.map((i) => `<div class="fixmini"><span class="from">${esc(i.found)}</span><span class="to">${esc(i.suggestion)}</span></div>`).join('')}</div><button class="link-btn" data-go="review">See all ${a.issues.length} issues</button>`
        : '<p class="summary">No wording problems were found.</p>'}
        </div>
      </div>

      <div class="two">
        <div class="panel rise" style="--i:4">
          <h3>Skills we found</h3>
          <div class="chips">${a.skills.map((x) => `<span class="chip">${esc(x)}</span>`).join('') || '<span class="summary">None found.</span>'}</div>
        </div>
        <div class="panel rise" style="--i:5">
          <h3>Projects we found</h3>
          ${a.projects.length ? a.projects.map((p) => `<div class="proj"><b>${esc(p.name)}</b><div class="chips">${p.tech.map((x) => `<span class="chip">${esc(x)}</span>`).join('')}</div></div>`).join('') : '<p class="summary">None found. Add a projects section to get project questions.</p>'}
        </div>
      </div>`;
  }

  function resumeHTML() {
    if (!state.resume) {
      return `<div class="rise">${dropzone({ title: 'Upload your CV', hint: 'PDF, DOCX or TXT, up to 5 MB. Only the analysis is saved, never the file.', big: true })}</div>`;
    }
    const r = state.resume;
    const ext = (r.fileName.split('.').pop() || 'CV').slice(0, 4).toUpperCase();
    return `
      <div class="panel cv-card rise" style="--i:0">
        <div class="cv-icon" aria-hidden="true">${esc(ext)}</div>
        <div class="cv-info">
          <h3>${esc(r.fileName)}</h3>
          <p>${fmtSize(r.fileSize)}, analyzed ${fmtDate(r.analyzedAt)}. Analysis number ${r.version}.</p>
        </div>
        <div class="cv-actions">
          <button class="btn btn-primary" data-go="overview"><span>View results</span></button>
          <button class="btn" id="toggle-replace" aria-expanded="false"><span>Try another CV</span></button>
          <button class="btn btn-danger" id="delete-cv"><span>Delete</span></button>
        </div>
      </div>
      <div class="replace" id="replace-panel"><div>
        <div class="note-box">Upload a different CV and it <b>replaces</b> this one. Upload the same CV again and you simply get these saved results back, with no new analysis.</div>
        ${dropzone({ title: 'Drop another CV here', hint: 'PDF, DOCX or TXT, up to 5 MB.' })}
      </div></div>`;
  }

  function questionsHTML() {
    if (!state.resume) return emptyState('questions');
    const qs = state.resume.analysis.questions;
    const counts = { all: qs.length, skills: 0, projects: 0, behavioral: 0 };
    qs.forEach((q) => { counts[q.category] += 1; });
    const pills = ['all', 'skills', 'projects', 'behavioral']
      .filter((k) => k === 'all' || counts[k])
      .map((k) => `<button class="pill ${state.qFilter.cat === k ? 'on' : ''}" data-cat="${k}">${k === 'all' ? 'All' : CATS[k]}<small>${counts[k]}</small></button>`)
      .join('');
    return `
      <div class="filters rise" style="--i:0">
        ${pills}
        <select class="input" id="q-diff" aria-label="Difficulty">
          <option value="all">Any difficulty</option><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option>
        </select>
        <input class="input grow" id="q-search" type="search" placeholder="Search questions" aria-label="Search questions" value="${esc(state.qFilter.q)}">
      </div>
      <p class="count-line" id="q-count"></p>
      <div class="q-list" id="q-list"></div>`;
  }

  function drawQuestions() {
    const list = $('#q-list');
    if (!list) return;
    const f = state.qFilter;
    const needle = f.q.trim().toLowerCase();
    const items = state.resume.analysis.questions.filter(
      (q) => (f.cat === 'all' || q.category === f.cat) && (f.diff === 'all' || q.difficulty === f.diff) && (!needle || `${q.question} ${q.topic}`.toLowerCase().includes(needle))
    );
    $('#q-count').textContent = items.length ? `${items.length} question${items.length === 1 ? '' : 's'}. Select one to see what the interviewer is testing.` : '';
    if (!items.length) {
      list.innerHTML = '<div class="empty"><h3>No questions match</h3><p>Clear the search or pick a different filter.</p></div>';
      return;
    }
    list.innerHTML = items
      .map(
        (q, idx) => `
      <article class="q" style="animation: rise 0.5s var(--ease) both; animation-delay:${Math.min(idx, 10) * 40}ms">
        <button class="q-head" aria-expanded="false">
          <div>
            <div class="q-meta"><span class="tag ${q.category}">${CATS[q.category]}</span>${q.topic ? `<span class="topic">${esc(q.topic)}</span>` : ''}<span class="diff ${q.difficulty}"><i></i>${q.difficulty[0].toUpperCase() + q.difficulty.slice(1)}</span></div>
            <p class="q-text">${esc(q.question)}</p>
          </div>
          <span class="chev" aria-hidden="true"></span>
        </button>
        <div class="q-body"><div><div class="q-inner">${qInner(q)}</div></div></div>
      </article>`
      )
      .join('');
  }

  function reviewHTML() {
    if (!state.resume) return emptyState('review');
    const a = state.resume.analysis;
    const counts = { all: a.issues.length };
    a.issues.forEach((i) => { counts[i.type] = (counts[i.type] || 0) + 1; });
    const pills = ['all', ...Object.keys(ISSUE_TYPES).filter((k) => counts[k])]
      .map((k) => `<button class="pill ${state.rFilter === k ? 'on' : ''}" data-type="${k}">${k === 'all' ? 'All' : ISSUE_TYPES[k]}<small>${counts[k]}</small></button>`)
      .join('');

    const bars = Object.keys(SCORE_LABELS)
      .map((k, i) => `<div class="sbar" style="--i:${i}"><span>${SCORE_LABELS[k]}</span><i style="--w:${a.scores[k]}%" class="${a.scores[k] < 55 ? 'low' : ''}"></i><b>${a.scores[k]}</b></div>`)
      .join('');

    return `
      <div class="panel rise" style="--i:0"><h3>Score breakdown</h3><div class="scores">${bars}</div></div>
      <div style="height:22px"></div>
      ${a.issues.length ? `<div class="filters rise" style="--i:1">${pills}</div><div class="q-list" id="issue-list"></div>`
        : '<div class="panel clean rise" style="--i:1"><h3>No wording problems found</h3><p class="summary">Your CV reads clean. Spend your time on the interview questions.</p></div>'}`;
  }

  function drawIssues() {
    const list = $('#issue-list');
    if (!list) return;
    const items = state.resume.analysis.issues.filter((i) => state.rFilter === 'all' || i.type === state.rFilter);
    list.innerHTML = items
      .map(
        (i, idx) => `
      <article class="issue ${i.severity}" style="animation: rise 0.5s var(--ease) both; animation-delay:${Math.min(idx, 10) * 40}ms">
        <div class="issue-top"><span class="sev ${i.severity}">${i.severity[0].toUpperCase() + i.severity.slice(1)} priority</span><span>${ISSUE_TYPES[i.type]}</span></div>
        <div class="swap">
          ${i.found ? `<span class="from">${esc(i.found)}</span>` : ''}
          <span class="to">${esc(i.suggestion)}</span>
        </div>
        ${i.reason ? `<p class="why">${esc(i.reason)}</p>` : ''}
        ${i.found && i.suggestion ? `<button class="copy" data-copy="${esc(i.suggestion)}">Copy suggestion</button>` : ''}
      </article>`
      )
      .join('');
  }


  /* ───────── company prep ───────── */
  const PCATS = { technical: 'Technical', projects: 'Your projects', company: 'About the company', behavioral: 'HR and behavioral' };

  function prepListHTML() {
    if (!state.preps.length) return '';
    return `<div class="prep-head"><h3>Your practice sets</h3></div>
      <div class="prep-list">${state.preps
        .map(
          (p) => `<div class="prep-item">
            <button class="prep-open" data-prep-open="${esc(p.id)}"><b>${esc(p.company)}</b><span>${p.role ? esc(p.role) + ', ' : ''}${p.matchScore != null ? 'CV match ' + p.matchScore + '/100, ' : ''}${fmtDate(p.createdAt)}</span></button>
            <button class="prep-del" data-prep-del="${esc(p.id)}" aria-label="Delete ${esc(p.company)} practice set">Delete</button>
          </div>`
        )
        .join('')}</div>`;
  }

  function prepHTML() {
    if (!state.resume) return emptyState('prep');
    if (state.prep) return prepDetailHTML(state.prep);
    return `
      <div class="panel rise" style="--i:0">
        <h3>Which company are you preparing for?</h3>
        <form class="prep-form" id="prep-form" novalidate>
          <div class="two-col">
            <div class="field"><label for="p-company">Company</label>
              <div class="suggest-wrap">
                <input class="input" id="p-company" maxlength="80" placeholder="Start typing, e.g. Infosys, Zoho, Google" autocomplete="off" required role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="p-suggest">
                <ul class="suggest" id="p-suggest" role="listbox" hidden></ul>
              </div>
            </div>
            <div class="field"><label for="p-role">Role (optional)</label><input class="input" id="p-role" maxlength="80" placeholder="e.g. Backend developer intern"></div>
          </div>
          <div class="field">
            <label for="p-jd">Job description (optional)</label>
            <textarea class="input" id="p-jd" maxlength="6000" placeholder="Paste the job post here for sharper questions"></textarea>
            <p class="help">We look up the company, then write questions from the company, the job description, and the skills and projects on your CV.</p>
          </div>
          <div><button class="btn btn-primary" type="submit"><span>Create practice set</span></button></div>
        </form>
      </div>
      ${prepListHTML()}`;
  }

  function matchHTML(m, p) {
    if (!m) return '';
    const t = tier(m.score);
    const label = m.score >= 80 ? 'Strong match' : m.score >= 65 ? 'Good match' : m.score >= 50 ? 'Partial match' : 'Weak match';
    return `
      <div class="match-grid">
        <div class="score-card rise" style="--i:1">
          ${ring(m.score)}
          <div>
            <span class="tier ${t.cls}">${label}</span>
            <h2>CV match for ${esc(p.company)}</h2>
            <p class="summary">${esc(m.verdict)}</p>
            <p class="meta">${m.basis === 'job_description' ? 'Scored against the job description you pasted.' : 'No job description was added, so this is scored against what the role usually needs. Paste a job description for a sharper score.'}</p>
          </div>
        </div>
        <div class="panel rise" style="--i:2">
          <h3>What matches and what is missing</h3>
          <p class="mini">Matches</p>
          <div class="chips">${m.matched.map((x) => `<span class="chip ok">${esc(x)}</span>`).join('') || '<span class="summary">Nothing clear was found.</span>'}</div>
          <p class="mini">Missing</p>
          <div class="chips">${m.missing.map((x) => `<span class="chip miss">${esc(x)}</span>`).join('') || '<span class="summary">No gaps found.</span>'}</div>
          ${m.improve.length ? `<p class="mini">Raise your score</p><ul class="list good">${m.improve.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
        </div>
      </div>`;
  }

  function prepDetailHTML(p) {
    const d = p.data;
    const counts = { all: d.questions.length };
    d.questions.forEach((q) => { counts[q.category] = (counts[q.category] || 0) + 1; });
    const pills = ['all', 'technical', 'projects', 'company', 'behavioral']
      .filter((k) => counts[k])
      .map((k) => `<button class="pill ${state.pFilter === k ? 'on' : ''}" data-pcat="${k}">${k === 'all' ? 'All' : PCATS[k]}<small>${counts[k]}</small></button>`)
      .join('');
    const conf = { high: ['good', 'Backed by web research'], medium: ['warn', 'Partly verified'], low: ['warn', 'Mostly general patterns'] }[d.confidence];
    const sources = (p.sources || []).length
      ? `<div class="panel rise" style="--i:6"><h3>Sources we used</h3><ul class="src-list">${p.sources.map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.title)}</a></li>`).join('')}</ul></div>`
      : '';

    return `
      <button class="btn btn-plain back" data-prep-back><span>Back to all practice sets</span></button>
      <div class="company-card rise" style="--i:0">
        <h2>${esc(d.company.name || p.company)}</h2>
        ${p.role ? `<p class="role">${esc(p.role)}</p>` : ''}
        <dl>
          ${d.company.summary ? `<div><dt>What they do</dt><dd>${esc(d.company.summary)}</dd></div>` : ''}
          ${d.company.history ? `<div><dt>History</dt><dd>${esc(d.company.history)}</dd></div>` : ''}
          ${d.company.culture ? `<div><dt>What they look for</dt><dd>${esc(d.company.culture)}</dd></div>` : ''}
        </dl>
        <div class="trust">
          <span class="tag ${conf[0]}">${conf[1]}</span>
          <span class="tag ${p.hasJobDescription ? 'good' : 'warn'}">${p.hasJobDescription ? 'Uses your job description' : 'No job description added'}</span>
        </div>
        ${d.caveats ? `<p class="caveat">${esc(d.caveats)}</p>` : ''}
      </div>

      ${matchHTML(d.match, p)}

      <div class="two">
        <div class="panel rise" style="--i:1">
          <h3>Likely interview rounds</h3>
          ${d.process.length ? `<ol class="rounds">${d.process.map((r) => `<li><b>${esc(r.round)}</b><span>${esc(r.what)}</span></li>`).join('')}</ol>` : '<p class="summary">No process information was found.</p>'}
        </div>
        <div class="panel rise" style="--i:2">
          <h3>Topics to revise</h3>
          <div class="chips">${d.focusAreas.map((x) => `<span class="chip">${esc(x)}</span>`).join('') || '<span class="summary">None listed.</span>'}</div>
        </div>
      </div>

      <div class="prep-head rise" style="--i:3"><h3>Practice questions</h3></div>
      <div class="filters rise" style="--i:3">${pills}</div>
      <div class="q-list" id="pq-list"></div>

      <div class="two">
        <div class="panel rise" style="--i:4">
          <h3>Before the interview</h3>
          <ul class="list good">${d.prepPlan.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
        </div>
        <div class="panel rise" style="--i:5">
          <h3>Questions you can ask them</h3>
          <ul class="list good">${d.askThem.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
        </div>
      </div>
      <div style="height:18px"></div>
      ${sources}`;
  }

  function drawPrepQuestions() {
    const list = $('#pq-list');
    if (!list || !state.prep) return;
    const items = state.prep.data.questions.filter((q) => state.pFilter === 'all' || q.category === state.pFilter);
    list.innerHTML = items
      .map(
        (q, idx) => `
      <article class="q" style="animation: rise 0.5s var(--ease) both; animation-delay:${Math.min(idx, 10) * 40}ms">
        <button class="q-head" aria-expanded="false">
          <div>
            <div class="q-meta"><span class="tag ${q.category}">${PCATS[q.category]}</span>${q.topic ? `<span class="topic">${esc(q.topic)}</span>` : ''}<span class="diff ${q.difficulty}"><i></i>${q.difficulty[0].toUpperCase() + q.difficulty.slice(1)}</span></div>
            <p class="q-text">${esc(q.question)}</p>
          </div>
          <span class="chev" aria-hidden="true"></span>
        </button>
        <div class="q-body"><div><div class="q-inner">${qInner(q)}</div></div></div>
      </article>`
      )
      .join('');
  }

  async function createPrep(e) {
    e.preventDefault();
    if (state.busy) return;
    const company = $('#p-company').value.trim();
    if (company.length < 2) { toast('Enter the company you are preparing for.', 'error'); $('#p-company').focus(); return; }
    state.busy = true;
    const btn = e.target.querySelector('button[type="submit"]');
    window.RIQ.setLoading(btn, true);
    startOverlay('Researching ' + company, ['Looking up ' + company, 'Reading your skills and projects', 'Writing practice questions', 'Building your prep plan']);
    try {
      const data = await api('/api/prep', { method: 'POST', body: { company, role: $('#p-role').value, jobDescription: $('#p-jd').value } });
      await finishOverlay();
      state.prep = data.prep;
      state.pFilter = 'all';
      const meta = { id: data.prep.id, company: data.prep.company, role: data.prep.role, grounded: data.prep.grounded, matchScore: data.prep.data.match ? data.prep.data.match.score : null, createdAt: data.prep.createdAt };
      state.preps = [meta, ...state.preps.filter((p) => p.id !== meta.id)].slice(0, 5);
      renderPrep();
      toast(data.reused ? 'You already made this one, so we opened it.' : 'Practice set ready.', data.reused ? 'info' : 'success');
    } catch (err) {
      stopOverlay();
      if (err.status === 401) return go('/login');
      toast(err.message, 'error', 6500);
      window.RIQ.setLoading(btn, false);
    } finally {
      state.busy = false;
    }
  }

  async function openPrep(id) {
    try {
      state.prep = (await api(`/api/prep/${encodeURIComponent(id)}`)).prep;
      state.pFilter = 'all';
      renderPrep();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) { toast(err.message, 'error'); }
  }

  async function deletePrep(id) {
    try {
      await api(`/api/prep/${encodeURIComponent(id)}`, { method: 'DELETE' });
      state.preps = state.preps.filter((p) => p.id !== id);
      renderPrep();
      toast('Practice set deleted.', 'success', 2500);
    } catch (err) { toast(err.message, 'error'); }
  }

  /* loads the company list by itself if the page did not include companies.js */
  let companiesLoading = null;
  function loadCompanies() {
    if (window.RIQ.matchCompanies) return Promise.resolve(true);
    if (!companiesLoading) {
      companiesLoading = new Promise((resolve) => {
        const el = document.createElement('script');
        el.src = '/assets/js/companies.js';
        el.onload = () => resolve(Boolean(window.RIQ.matchCompanies));
        el.onerror = () => resolve(false);
        document.head.appendChild(el);
      }).then((ok) => {
        if (!ok) console.warn('Company suggestions are off: /assets/js/companies.js is missing or has an error.');
        companiesLoading = ok ? null : companiesLoading;
        return ok;
      });
    }
    return companiesLoading;
  }

  /* company autosuggest: arrows move, Enter picks, Esc closes. Any typed name is still allowed. */
  function setupSuggest() {
    const input = $('#p-company');
    const list = $('#p-suggest');
    if (!input || !list || input.dataset.ready) return;
    input.dataset.ready = '1';
    let items = [];
    let active = -1;

    const close = () => { list.hidden = true; input.setAttribute('aria-expanded', 'false'); active = -1; };
    const mark = (name, q) => {
      const i = q ? name.toLowerCase().indexOf(q.toLowerCase()) : -1;
      if (i < 0) return esc(name);
      return `${esc(name.slice(0, i))}<mark>${esc(name.slice(i, i + q.length))}</mark>${esc(name.slice(i + q.length))}`;
    };
    const paint = () => {
      $$('.suggest li', list).forEach((li, i) => {
        const on = i === active;
        li.classList.toggle('on', on);
        li.setAttribute('aria-selected', String(on));
        if (on) { input.setAttribute('aria-activedescendant', li.id); li.scrollIntoView({ block: 'nearest' }); }
      });
      if (active < 0) input.removeAttribute('aria-activedescendant');
    };
    const pick = (name) => {
      input.value = name;
      close();
      const role = $('#p-role');
      if (role) role.focus();
    };
    const open = async () => {
      if (!window.RIQ.matchCompanies && !(await loadCompanies())) return;
      const q = input.value.trim();
      const recent = state.preps.map((p) => p.company);
      items = window.RIQ.matchCompanies(q, recent, 7);
      if (!items.length) return close();
      list.innerHTML =
        (q ? '' : '<li class="hint" aria-hidden="true">Popular companies</li>') +
        items.map((n, i) => `<li role="option" id="sg-${i}" data-name="${esc(n)}" aria-selected="false">${mark(n, q)}</li>`).join('');
      list.hidden = false;
      input.setAttribute('aria-expanded', 'true');
      active = -1;
    };

    input.addEventListener('input', open);
    input.addEventListener('focus', open);
    input.addEventListener('keydown', (e) => {
      if (list.hidden && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) { open(); }
      if (list.hidden) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); active = (active + 1) % items.length; paint(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); active = (active - 1 + items.length) % items.length; paint(); }
      else if (e.key === 'Enter' && active >= 0) { e.preventDefault(); pick(items[active]); }
      else if (e.key === 'Escape') { e.stopPropagation(); close(); }
      else if (e.key === 'Tab') { close(); }
    });
    // mousedown (not click) so the input does not lose focus first
    list.addEventListener('mousedown', (e) => {
      const li = e.target.closest('li[data-name]');
      if (li) { e.preventDefault(); pick(li.dataset.name); }
    });
    document.addEventListener('mousedown', (e) => {
      if (!e.target.closest('.suggest-wrap')) close();
    });
  }

  function renderPrep() {
    const v = $('#view-prep');
    v.innerHTML = prepHTML();
    v.classList.add('enter');
    drawPrepQuestions();
    const form = $('#prep-form');
    if (form) form.addEventListener('submit', createPrep);
    setupSuggest();
    animateIn(v);
  }

  /* ───────── rendering ───────── */
  function renderUser() {
    const u = state.user;
    $('#u-name').textContent = u.name;
    $('#u-email').textContent = u.email;
    const av = $('#u-avatar');
    if (u.avatar) {
      av.style.backgroundImage = `url("${u.avatar.replace(/"/g, '%22')}")`;
    } else {
      av.textContent = u.name.trim()[0].toUpperCase();
    }
    const h = new Date().getHours();
    $('#hello').textContent = `${h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'}, ${u.name.split(' ')[0]}`;
  }

  function renderAll() {
    $('#view-overview').innerHTML = overviewHTML();
    $('#view-resume').innerHTML = resumeHTML();
    $('#view-questions').innerHTML = questionsHTML();
    $('#view-review').innerHTML = reviewHTML();
    $('#view-prep').innerHTML = prepHTML();
    const pf = $('#prep-form');
    if (pf) pf.addEventListener('submit', createPrep);
    setupSuggest();
    if (state.resume) { drawQuestions(); drawIssues(); drawPrepQuestions(); }

    const a = state.resume && state.resume.analysis;
    const bq = $('#badge-q');
    const br = $('#badge-r');
    bq.hidden = !a; br.hidden = !a || !a.issues.length;
    if (a) { bq.textContent = a.questions.length; br.textContent = a.issues.length; }
    $('#btn-another').hidden = !state.resume;
    animateIn($('.view.active') || document);
  }

  function switchView(name, { instant = false } = {}) {
    if (!VIEWS[name]) name = 'overview';
    const cur = $('.view.active');
    const next = $(`#view-${name}`);
    state.view = name;
    $$('.nav-btn').forEach((b) => b.classList.toggle('active', b.dataset.view === name));
    $('#page-title').textContent = VIEWS[name];
    history.replaceState(null, '', `#${name}`);
    if (cur === next) return;

    const show = () => {
      next.classList.add('active');
      requestAnimationFrame(() => { requestAnimationFrame(() => { next.classList.add('enter'); animateIn(next); }); });
    };
    if (cur) {
      if (instant) { cur.classList.remove('active', 'enter', 'leave'); show(); }
      else {
        cur.classList.add('leave');
        setTimeout(() => { cur.classList.remove('active', 'enter', 'leave'); show(); }, 200);
      }
    } else show();
    window.scrollTo({ top: 0, behavior: instant ? 'auto' : 'smooth' });
  }

  /* ───────── upload flow ───────── */
  let stepTimers = [];
  function startOverlay(title, steps) {
    const box = $('#analyzing');
    $('#an-title').textContent = title;
    const sub = $('.an-sub');
    if (sub) sub.textContent = 'This can take up to two minutes. Keep this tab open.';
    $('#an-steps').innerHTML = steps.map((t) => `<li>${esc(t)}</li>`).join('');
    const items = $$('#an-steps li');
    items[0].classList.add('now');
    box.hidden = false;
    document.body.style.overflow = 'hidden';
    [4000, 11000, 22000].forEach((ms, i) => {
      if (!items[i + 1]) return;
      stepTimers.push(setTimeout(() => {
        items[i].classList.replace('now', 'done');
        items[i + 1].classList.add('now');
      }, ms));
    });
  }
  function stopOverlay() {
    stepTimers.forEach(clearTimeout);
    stepTimers = [];
    $('#analyzing').hidden = true;
    document.body.style.overflow = '';
  }
  async function finishOverlay() {
    stepTimers.forEach(clearTimeout);
    stepTimers = [];
    $$('#an-steps li').forEach((li) => { li.classList.remove('now'); li.classList.add('done'); });
    await new Promise((r) => setTimeout(r, 600));
    stopOverlay();
  }
  const startAnalyzing = () => startOverlay('Reading your CV', ['Reading your CV', 'Finding your skills and projects', 'Writing interview questions', 'Checking wording and keywords']);
  const stopAnalyzing = stopOverlay;
  const finishAnalyzing = finishOverlay;

  async function handleFile(file) {
    if (!file || state.uploading) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['pdf', 'docx', 'txt'].includes(ext)) return toast('Upload a PDF, DOCX or TXT file.', 'error');
    if (file.size > 5 * 1024 * 1024) return toast('That file is larger than 5 MB.', 'error');

    state.uploading = true;
    const form = new FormData();
    form.append('resume', file);
    startAnalyzing();
    try {
      const data = await api('/api/resume/upload', { method: 'POST', form });
      state.resume = data.resume;
      state.qFilter = { cat: 'all', diff: 'all', q: '' };
      state.rFilter = 'all';
      if (!data.reused) { state.preps = []; state.prep = null; }
      await finishAnalyzing();
      renderAll();
      if (state.view !== 'overview') switchView('overview'); else animateIn($('#view-overview'));
      toast(data.message, data.reused ? 'info' : 'success');
    } catch (err) {
      stopAnalyzing();
      if (err.status === 401) return go('/login');
      toast(err.message, 'error', 6500);
    } finally {
      state.uploading = false;
    }
  }

  /* ───────── events ───────── */
  function bindEvents() {
    $$('.nav-btn').forEach((b) => b.addEventListener('click', () => switchView(b.dataset.view)));

    $('#btn-another').addEventListener('click', () => {
      switchView('resume');
      setTimeout(() => {
        const panel = $('#replace-panel');
        if (panel && !panel.classList.contains('open')) $('#toggle-replace').click();
      }, 450);
    });

    const logout = async () => {
      try { await api('/api/auth/logout', { method: 'POST' }); } catch { /* ignore */ }
      go('/');
    };
    $('#logout').addEventListener('click', logout);
    $('#logout-2').addEventListener('click', logout);

    // one delegated listener for everything rendered dynamically
    document.addEventListener('click', (e) => {
      const pOpen = e.target.closest('[data-prep-open]');
      if (pOpen) return openPrep(pOpen.dataset.prepOpen);
      const pDel = e.target.closest('[data-prep-del]');
      if (pDel) return deletePrep(pDel.dataset.prepDel);
      if (e.target.closest('[data-prep-back]')) { state.prep = null; return renderPrep(); }
      const pCat = e.target.closest('[data-pcat]');
      if (pCat) {
        state.pFilter = pCat.dataset.pcat;
        $$('#view-prep .pill').forEach((p) => p.classList.toggle('on', p === pCat));
        return drawPrepQuestions();
      }

      const goBtn = e.target.closest('[data-go]');
      if (goBtn) return switchView(goBtn.dataset.go);

      const toggle = e.target.closest('#toggle-replace');
      if (toggle) {
        const panel = $('#replace-panel');
        const open = panel.classList.toggle('open');
        toggle.setAttribute('aria-expanded', String(open));
        return;
      }
      if (e.target.closest('#delete-cv')) { $('#confirm').hidden = false; return; }

      const cat = e.target.closest('[data-cat]');
      if (cat) {
        state.qFilter.cat = cat.dataset.cat;
        $$('#view-questions .pill').forEach((p) => p.classList.toggle('on', p === cat));
        return drawQuestions();
      }
      const type = e.target.closest('[data-type]');
      if (type) {
        state.rFilter = type.dataset.type;
        $$('#view-review .pill').forEach((p) => p.classList.toggle('on', p === type));
        return drawIssues();
      }
      const head = e.target.closest('.q-head');
      if (head) {
        const card = head.closest('.q');
        const open = card.classList.toggle('open');
        head.setAttribute('aria-expanded', String(open));
        return;
      }
      const copy = e.target.closest('[data-copy]');
      if (copy) {
        navigator.clipboard.writeText(copy.dataset.copy).then(() => toast('Suggestion copied.', 'success', 2000)).catch(() => toast('Copy failed. Select the text instead.', 'error'));
      }
    });

    document.addEventListener('input', (e) => {
      if (e.target.id === 'q-search') { state.qFilter.q = e.target.value; drawQuestions(); }
    });
    document.addEventListener('change', (e) => {
      if (e.target.id === 'q-diff') { state.qFilter.diff = e.target.value; drawQuestions(); }
      if (e.target.classList.contains('file-in')) {
        handleFile(e.target.files[0]);
        e.target.value = '';
      }
    });

    // drag and drop on any dropzone
    ['dragenter', 'dragover'].forEach((ev) => document.addEventListener(ev, (e) => {
      const dz = e.target.closest && e.target.closest('.dropzone');
      if (dz) { e.preventDefault(); dz.classList.add('drag'); }
    }));
    ['dragleave', 'drop'].forEach((ev) => document.addEventListener(ev, (e) => {
      const dz = e.target.closest && e.target.closest('.dropzone');
      if (dz) dz.classList.remove('drag');
    }));
    document.addEventListener('drop', (e) => {
      const dz = e.target.closest && e.target.closest('.dropzone');
      if (dz) { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }
    });
    // stop the browser opening a file that is dropped outside a dropzone
    window.addEventListener('dragover', (e) => e.preventDefault());
    window.addEventListener('drop', (e) => e.preventDefault());

    // keyboard: Enter or Space on a dropzone opens the picker
    document.addEventListener('keydown', (e) => {
      const dz = e.target.classList && e.target.classList.contains('dropzone') ? e.target : null;
      if (dz && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); $('.file-in', dz).click(); }
      if (e.key === 'Escape' && !$('#confirm').hidden) $('#confirm').hidden = true;
    });

    // delete confirmation
    $('#cf-cancel').addEventListener('click', () => { $('#confirm').hidden = true; });
    $('#cf-ok').addEventListener('click', async () => {
      const btn = $('#cf-ok');
      window.RIQ.setLoading(btn, true);
      try {
        await api('/api/resume', { method: 'DELETE' });
        state.resume = null;
        state.preps = [];
        state.prep = null;
        $('#confirm').hidden = true;
        renderAll();
        switchView('overview');
        toast('Your saved CV was deleted.', 'success');
      } catch (err) {
        toast(err.message, 'error');
      } finally {
        window.RIQ.setLoading(btn, false);
      }
    });
  }

  /* ───────── start ───────── */
  async function init() {
    try {
      state.user = (await api('/api/auth/me')).user;
    } catch {
      return go('/login');
    }
    renderUser();
    try {
      state.resume = (await api('/api/resume')).resume;
      if (state.resume) state.preps = (await api('/api/prep')).preps;
    } catch (err) {
      toast(err.message, 'error');
    }
    bindEvents();
    const wanted = location.hash.slice(1);
    state.view = VIEWS[wanted] ? wanted : 'overview';
    $$('.view').forEach((v) => v.classList.remove('active', 'enter', 'leave'));
    $$('.nav-btn').forEach((b) => b.classList.toggle('active', b.dataset.view === state.view));
    $('#page-title').textContent = VIEWS[state.view];
    renderAll();
    const first = $(`#view-${state.view}`);
    first.classList.add('active');
    requestAnimationFrame(() => requestAnimationFrame(() => { first.classList.add('enter'); animateIn(first); }));
  }

  init();
})();