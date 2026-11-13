// The editor's brain: decides which of the ranked stories are worth a post.
//
// The rules in score.js are a cheap first pass. Stories that clear a lower bar come here,
// and an AI (Claude with ANTHROPIC_API_KEY, or Gemini's free tier with GEMINI_API_KEY) reads them the way the page's editor would:
// the page's own guide (brand.editor), plus the editor's recent Post and Skip taps, which
// it treats as the strongest signal of taste. Without a key, the rules decide alone, still
// nudged by the taps (a kind of story the editor keeps skipping is held back).
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import * as store from './store.js';

const TASTE_MAX = 60;
const tasteKey = (brandId) => `ap:taste:${brandId}`;
// Claude when ANTHROPIC_API_KEY is set; otherwise Google's Gemini on its free tier when
// GEMINI_API_KEY is set; otherwise the rules.
export const brainKind = () => (process.env.ANTHROPIC_API_KEY ? 'claude' : process.env.GEMINI_API_KEY ? 'gemini' : '');
export const brainAvailable = () => !!brainKind();

// Remember what the editor did with a draft: 'post' or 'skip'.
export async function recordTaste(draft, decision) {
  if (!draft?.brand) return;
  const s = draft.pack?.story || {};
  const entry = { d: decision, h: draft.pack?.words?.headline || '', t: s.title || s.name || '', sport: s.sport || '', type: draft.type || '', at: new Date().toISOString() };
  await store.pushList(tasteKey(draft.brand), entry, TASTE_MAX).catch(() => null);
}
export const readTaste = (brandId) => store.getList(tasteKey(brandId), TASTE_MAX).catch(() => []);

// Without Claude: a sport+type the editor skipped at least 3 times and never posted is held back.
export function tasteBlocks(taste, c) {
  const k = `${c.story.sport}|${c.type}`;
  const same = taste.filter((e) => `${e.sport}|${e.type}` === k);
  return same.filter((e) => e.d === 'skip').length >= 3 && !same.some((e) => e.d === 'post');
}

const Verdicts = z.object({
  verdicts: z.array(
    z.object({
      n: z.number().int(),
      post: z.boolean(),
      priority: z.enum(['P1', 'P2', 'P3']),
      why: z.string(),
      same_as: z.number().int().nullable().optional(),
    }),
  ),
});

function brief(c, i) {
  const s = c.story;
  const headline = s.kind === 'news' ? s.title : [s.home?.name, s.home?.score, '–', s.away?.score, s.away?.name, s.status?.detail].filter((x) => x != null && x !== '').join(' ');
  return { n: i, sport: s.sport, competition: s.league?.name || undefined, type: c.type, headline, summary: s.kind === 'news' ? String(s.summary || '').slice(0, 280) : undefined, source: s.source || undefined, rule_score: c.score };
}

export function systemPrompt(brand, taste) {
  const g = brand.editor || {};
  const posted = taste.filter((e) => e.d === 'post').slice(0, 25);
  const skipped = taste.filter((e) => e.d === 'skip').slice(0, 25);
  const line = (e) => `- [${e.sport}/${e.type}] ${e.t || e.h}`;
  return `You are the news editor of ${brand.name} (${brand.handle}) on Instagram. You decide which stories become posts.
${g.mission || ''}
Post: ${(g.post || []).join(' ')}
Do not post: ${(g.skip || []).join(' ')}
${g.bar || ''}
${posted.length ? `Stories the editor recently chose to post (follow this taste):\n${posted.map(line).join('\n')}` : ''}
${skipped.length ? `Stories the editor recently skipped (avoid more like these):\n${skipped.map(line).join('\n')}` : ''}
For every story return: post (true/false), priority (P1 = post within minutes, a big moment for the page; P2 = worth a post today; P3 = minor), why (at most 12 words, plain, for the editor), and same_as (the n of an earlier story in this list about the same event, else null; only the best version of an event should have post=true).
Judge only from what is given. When unsure, say false: the editor would rather miss a small story than post a weak one.`;
}

// JSON schema for Gemini's structured output (the same shape as Verdicts).
const GEMINI_SCHEMA = {
  type: 'OBJECT',
  properties: {
    verdicts: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: { n: { type: 'INTEGER' }, post: { type: 'BOOLEAN' }, priority: { type: 'STRING', enum: ['P1', 'P2', 'P3'] }, why: { type: 'STRING' }, same_as: { type: 'INTEGER', nullable: true } },
        required: ['n', 'post', 'priority', 'why'],
      },
    },
  },
  required: ['verdicts'],
};

// Google retires Gemini models for new accounts often, so try a short list of free-tier
// models and remember the first that answers. GEMINI_MODEL, when set, is tried first.
export const GEMINI_MODELS = ['gemini-3.5-flash', 'gemini-3.1-flash-lite', 'gemini-3-flash-preview', 'gemini-flash-latest'];
let geminiModel = null;
// Worth trying the next model: this one is retired, unknown, overloaded or out of free quota.
const retired = (status, msg) => [404, 429, 500, 503].includes(status) || /no longer available|not found|not supported|is not available|unknown model|high demand|overloaded|try again later|quota|exhausted/i.test(msg || '');

async function geminiCall(model, system, user) {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: user }] }],
      generationConfig: { responseMimeType: 'application/json', responseSchema: GEMINI_SCHEMA, temperature: 0.2 },
    }),
  });
  const out = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e = new Error(`gemini ${model}: ${out.error?.message || `HTTP ${res.status}`}`);
    e.retired = retired(res.status, out.error?.message);
    throw e;
  }
  const text = out.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
  return Verdicts.parse(JSON.parse(text)).verdicts;
}

export function resetGeminiModel() {
  geminiModel = null;
}

async function askGemini(system, user) {
  const list = [...new Set([geminiModel, process.env.GEMINI_MODEL, ...GEMINI_MODELS].filter(Boolean))];
  let last;
  for (const model of list) {
    try {
      const v = await geminiCall(model, system, user);
      geminiModel = model;
      return v;
    } catch (e) {
      last = e;
      if (!e.retired) throw e;
      if (model === geminiModel) geminiModel = null;
    }
  }
  throw last;
}

async function askClaude(system, user) {
  client ||= new Anthropic();
  const res = await client.messages.parse({
    model: 'claude-opus-5-5',
    max_tokens: 3000,
    output_config: { effort: 'low', format: zodOutputFormat(Verdicts) },
    system,
    messages: [{ role: 'user', content: user }],
  });
  return res.parsed_output?.verdicts || [];
}

// With a brain configured but unreachable, the rules alone send only stories this big.
export const BRAINLESS_BAR = 8;

let client = null;
// Returns the candidates the brain wants posted, best first, each with priority and why.
// cands: [{ story, type, score, key, ... }] already ranked by the rules.
export async function judge(brand, cands, { taste = [], log = console } = {}) {
  if (!cands.length) return [];
  if (!brainAvailable()) {
    return cands.filter((c) => c.score >= 3 && !tasteBlocks(taste, c)).map((c) => ({ ...c, by: 'rules' }));
  }
  try {
    const kind = brainKind();
    const user = `Stories (JSON, best rule score first):\n${JSON.stringify(cands.map(brief))}`;
    const out = await (kind === 'claude' ? askClaude : askGemini)(systemPrompt(brand, taste), user);
    const byN = new Map(out.map((v) => [v.n, v]));
    const rank = { P1: 0, P2: 1, P3: 2 };
    return cands
      .map((c, i) => ({ c, v: byN.get(i) }))
      .filter(({ v }) => v?.post && v.same_as == null)
      .sort((a, b) => rank[a.v.priority] - rank[b.v.priority] || b.c.score - a.c.score)
      .map(({ c, v }) => ({ ...c, priority: v.priority, why: v.why, by: kind }));
  } catch (e) {
    // The brain is down or out of free quota. Only the very biggest stories go out on the
    // rules alone; the rest wait (marked failed, so they are asked about again next run).
    log.error?.('editor brain:', e?.message || e);
    const out = cands.filter((c) => c.score >= BRAINLESS_BAR && !tasteBlocks(taste, c)).map((c) => ({ ...c, by: 'rules' }));
    out.failed = true;
    return out;
  }
}
