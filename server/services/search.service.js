const config = require('../config/env');

/**
 * Optional web search through Tavily (https://tavily.com, free plan: 1,000 searches a month, no card).
 * It finds real pages and returns their text, so it does not use any AI model quota.
 * Every function returns null when no key is set or the call fails, and the caller carries on without it.
 */

const isConfigured = () => Boolean(config.search && config.search.tavilyKey);

// Sites where candidates usually post their interview experiences. Their pages are shown first.
const INTERVIEW_SITES = ['geeksforgeeks.org', 'ambitionbox.com', 'glassdoor', 'leetcode.com', 'reddit.com', 'medium.com', 'indeed.com', 'quora.com', 'naukri.com', 'prepinsta.com', 'interviewbit.com'];

const clip = (v, n) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, n);
const hostOf = (u) => { try { return new URL(u).hostname.replace(/^www\./i, '').toLowerCase(); } catch (e) { return ''; } };

async function tavily(query, maxResults) {
  if (!isConfigured()) return null;
  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.search.tavilyKey}` },
      body: JSON.stringify({ query, search_depth: 'basic', max_results: maxResults, topic: 'general', include_answer: false, include_raw_content: false }),
      signal: AbortSignal.timeout(25000),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const detail = (data && data.detail && (data.detail.error || data.detail)) || res.statusText;
      console.warn(`[search] Tavily HTTP ${res.status}: ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`);
      return null;
    }
    return (Array.isArray(data.results) ? data.results : []).filter((r) => r && /^https?:\/\//i.test(r.url || ''));
  } catch (err) {
    console.warn(`[search] Tavily failed (${err.message}).`);
    return null;
  }
}

/** Company facts for the prep prompt: { text, sources } or null. */
async function companyNotes(company, role) {
  const results = await tavily(`${company} company overview what it does products history culture hiring process${role ? ` ${role}` : ''}`, 5);
  if (!results || !results.length) return null;
  const text = results.map((r) => `${clip(r.title, 120)} (${hostOf(r.url)}): ${clip(r.content, 900)}`).join('\n\n');
  const sources = results.slice(0, 6).map((r) => ({ title: clip(r.title || r.url, 120), url: r.url.slice(0, 500) }));
  return { text, sources };
}

/**
 * Real pages about interviews at this company: [{ title, url, content }] or null.
 * Pages that never mention the company are dropped, and known interview-experience sites come first.
 */
async function interviewPages(company, role) {
  const results = await tavily(`${company}${role ? ` ${role}` : ''} interview experience questions asked by candidates`, 10);
  if (!results) return null;
  const name = String(company).toLowerCase().split(/\s+/)[0];
  const rank = (r) => (INTERVIEW_SITES.some((s) => hostOf(r.url).includes(s)) ? 0 : 1);
  const seen = new Set();
  const pages = results
    .filter((r) => `${r.title} ${r.content}`.toLowerCase().includes(name))
    .filter((r) => (seen.has(r.url) ? false : seen.add(r.url)))
    .sort((a, b) => rank(a) - rank(b))
    .slice(0, 6)
    .map((r) => ({ title: clip(r.title || hostOf(r.url), 120), url: r.url.slice(0, 700), content: clip(r.content, 800) }));
  return pages;
}

module.exports = { isConfigured, companyNotes, interviewPages };
