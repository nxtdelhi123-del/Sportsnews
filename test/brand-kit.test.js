import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { renderPack } from '../lib/studio/render.js';
import { TSB_KIT_TEMPLATES, headStack } from '../lib/studio/tsb-kit-templates.js';
import { templateOptions } from '../lib/studio/templates.js';
import tsb from '../lib/studio/brands/tsb.js';

const PNG = (b) => b.readUInt32BE(0) === 0x89504e47;
const examples = JSON.parse(readFileSync(new URL('../docs/brand-kit/examples.json', import.meta.url), 'utf8')).examples;

test('every brand-kit example renders without a photo', async () => {
  for (const ex of examples) {
    const { png, template } = await renderPack({ brand: tsb, type: ex.type || 'news', story: { kind: 'news' }, words: ex.words, assets: {} }, { template: ex.template, width: 270 });
    assert.equal(template, ex.template);
    assert.ok(PNG(Buffer.from(png)), ex.id);
  }
});

test('a feed match fills the scoreline and matchday posters on its own', async () => {
  const story = { kind: 'match', title: 'India beat Pakistan', date: '2026-11-24T14:00:00Z', venue: { city: 'Geneva' }, home: { name: 'India', abbr: 'IND', score: 2 }, away: { name: 'Pakistan', abbr: 'PAK', score: 1 } };
  for (const t of ['tsb-scoreline', 'tsb-matchday']) {
    const { png } = await renderPack({ brand: tsb, type: 'result', story, words: {}, assets: {} }, { template: t, width: 270 });
    assert.ok(PNG(Buffer.from(png)), t);
  }
});

test('headlines never leave a tiny word alone on a line', () => {
  const lines = headStack('NO. 47 BEATS NO. 4.', 970, { cap: 140, maxLines: 2 }).map((l) => l.text);
  assert.ok(lines.every((l) => l.replace(/[^A-Z0-9]/g, '').length > 3), lines.join(' / '));
});

test('the desk offers the brand-kit layouts', () => {
  assert.ok(templateOptions({ brand: tsb, type: 'news', story: { kind: 'news' }, words: { headline: 'X.' } }).includes('tsb-breaking'));
  assert.ok(templateOptions({ brand: tsb, type: 'result', story: { kind: 'match' }, words: {} }).includes('tsb-scoreline'));
  assert.equal(Object.keys(TSB_KIT_TEMPLATES).length, 13);
});
